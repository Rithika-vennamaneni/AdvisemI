import { env } from '../env.js';
import { logger } from '../util/logger.js';
import { supabase } from '../util/supabase.js';
import { normalizeSkillName, toPreferredTitleCase, trimSkillName } from '../util/strings.js';
import { runOpenAI } from '../util/openai.js';

export type MarketSkillResult = {
  inserted: number;
  skipped: boolean;
};

const toPositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const MAX_JOBS = toPositiveInt(env.MARKET_SKILL_MAX_JOBS, 4);
const MAX_SKILLS = toPositiveInt(env.MARKET_SKILL_MAX_SKILLS, 10);

const MARKET_SKILL_PROMPT = (jobDescription: string): string => {
  return [
    'You are designing a learning roadmap for a student.',
    '',
    'Extract ONLY concrete, teachable, technical skills that a candidate would need',
    'to explicitly learn or practice to qualify for this job.',
    '',
    'STRICT RULES:',
    '- EXCLUDE generic umbrella terms (e.g., "AI", "Machine Learning", "Data Science")',
    '- Prefer specific tools, frameworks, platforms, techniques, or methods',
    '- Infer skills ONLY if clearly implied by responsibilities',
    '- Each skill must be something a student could realistically study or train for',
    '- Exclude soft skills, role titles, and vague phrases',
    '',
    'OUTPUT RULES:',
    '- Return ONLY a JSON array',
    '- Each item must be 1–4 words',
    '- Use canonical, industry-standard skill names',
    '- Maximum 10 skills',
    '- No explanations, no markdown',
    '',
    'Job Description:',
    jobDescription
  ].join('\n');
};

const extractJsonArray = (text: string): string[] => {
  const trimmed = text.trim();
  const first = trimmed.indexOf('[');
  const last = trimmed.lastIndexOf(']');
  if (first === -1 || last === -1 || last <= first) {
    throw new Error('No JSON array found in model output');
  }
  const slice = trimmed.slice(first, last + 1);
  const parsed = JSON.parse(slice) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('Model output is not a JSON array');
  }
  return parsed
    .map((item) => (typeof item === 'string' ? item : String(item)))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const ensureAdzunaEnv = (): void => {
  if (!env.ADZUNA_APP_ID || !env.ADZUNA_APP_KEY) {
    throw new Error('Missing ADZUNA_APP_ID or ADZUNA_APP_KEY');
  }
};

type AdzunaJob = {
  description?: string | null;
  redirect_url?: string | null;
};

const fetchJobs = async (dreamRole: string, maxResults: number): Promise<AdzunaJob[]> => {
  ensureAdzunaEnv();
  const url = new URL('https://api.adzuna.com/v1/api/jobs/us/search/1');
  url.searchParams.set('app_id', env.ADZUNA_APP_ID!);
  url.searchParams.set('app_key', env.ADZUNA_APP_KEY!);
  url.searchParams.set('what', dreamRole);
  url.searchParams.set('results_per_page', String(maxResults));
  url.searchParams.set('sort_by', 'date');
  url.searchParams.set('content-type', 'application/json');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Adzuna request failed (${res.status})`);
    }
    const data = (await res.json()) as { results?: AdzunaJob[] };
    return data.results ?? [];
  } finally {
    clearTimeout(timeout);
  }
};

const deleteExistingMarketSkills = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('skills')
    .delete()
    .eq('user_id', userId)
    .eq('source', 'market');

  if (error) {
    throw new Error(`Failed to clear market skills: ${error.message}`);
  }
};

const insertMarketSkills = async (
  userId: string,
  dreamRole: string,
  rows: Array<{ skill_name: string; score: number; evidence: string | null }>
): Promise<number> => {
  if (rows.length === 0) return 0;

  const insertRows = rows.map((row) => ({
    user_id: userId,
    source: 'market',
    dream_role: dreamRole,
    skill_name: row.skill_name,
    score: row.score,
    evidence: row.evidence,
  }));

  const { error } = await supabase.from('skills').insert(insertRows);
  if (error) {
    throw new Error(`Failed to insert market skills: ${error.message}`);
  }

  return insertRows.length;
};

const countMarketSkills = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('skills')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source', 'market');

  if (error) {
    throw new Error(`Failed to count market skills: ${error.message}`);
  }

  return count ?? 0;
};

const extractSkillsForJobs = async (jobs: AdzunaJob[]): Promise<Map<string, { name: string; count: number; evidence: string | null }>> => {
  const agg = new Map<string, { name: string; count: number; evidence: string | null }>();

  for (const job of jobs) {
    const description = (job.description ?? '').trim();
    if (!description) continue;

    try {
      const prompt = MARKET_SKILL_PROMPT(description.slice(0, 4000));
      const responseText = await runOpenAI({
        input: prompt,
        jsonObject: false,
        maxOutputTokens: 300,
        temperature: 0.2
      });
      const skills = extractJsonArray(responseText);

      skills.forEach((skill) => {
        const trimmed = trimSkillName(skill);
        if (!trimmed) return;
        const key = normalizeSkillName(trimmed);
        if (!key) return;
        const existing = agg.get(key) ?? {
          name: toPreferredTitleCase(trimmed),
          count: 0,
          evidence: job.redirect_url ?? null
        };
        existing.count += 1;
        if (!existing.evidence && job.redirect_url) {
          existing.evidence = job.redirect_url;
        }
        agg.set(key, existing);
      });
    } catch (error) {
      logger.warn('Market skill extraction failed for job', { error: error instanceof Error ? error.message : String(error) });
    }

    await sleep(800);
  }

  return agg;
};

const fetchDreamRole = async (userId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('dream_role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch dream_role: ${error.message}`);
  }

  return data?.dream_role ?? null;
};

export const ensureMarketSkills = async (userId: string): Promise<MarketSkillResult> => {
  const existing = await countMarketSkills(userId);
  if (existing > 0) {
    logger.info('Market skills already exist', { user_id: userId, count: existing });
    return { inserted: 0, skipped: true };
  }

  const dreamRole = await fetchDreamRole(userId);
  if (!dreamRole) {
    throw new Error('Missing dream_role; cannot fetch market skills');
  }

  const jobs = await fetchJobs(dreamRole, MAX_JOBS);
  logger.info('Fetched job postings', { count: jobs.length });

  if (jobs.length === 0) {
    return { inserted: 0, skipped: true };
  }

  const agg = await extractSkillsForJobs(jobs);
  if (agg.size === 0) {
    return { inserted: 0, skipped: true };
  }

  const maxCount = Math.max(1, ...Array.from(agg.values()).map((item) => item.count));
  const rows = Array.from(agg.values())
    .map((item) => ({
      skill_name: item.name,
      score: Math.round((item.count / maxCount) * 1000) / 1000,
      evidence: item.evidence
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SKILLS);

  await deleteExistingMarketSkills(userId);
  const inserted = await insertMarketSkills(userId, dreamRole, rows);
  logger.info('Market skills inserted', { inserted });

  return { inserted, skipped: false };
};
