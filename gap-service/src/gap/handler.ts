import { z } from 'zod';
import type { Request, Response } from 'express';
import { supabase } from '../util/supabase.js';
import { logger } from '../util/logger.js';
import { preprocessSkills } from './preprocess.js';
import { runGeminiGapAnalysis } from '../gemini/client.js';
import { computeGapsDeterministic, computeGapsFromGemini, orderAndLimitGaps } from './analysis.js';
import type { MarketSkillRow, ResumeSkillRow } from './types.js';
import { normalizeSkillName, trimSkillName } from '../util/strings.js';
import { getRoleSkillFallback } from '../util/roleSkills.js';
import { createOrGetRun } from '../resume-parser/persist.js';

const requestSchema = z.object({
  user_id: z.string().uuid(),
  run_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).optional()
});

export type GapAnalysisRequest = z.infer<typeof requestSchema>;

export type GapResponse = {
  user_id: string;
  run_id: string;
  inserted_count: number;
  gaps: Array<{ skill_name: string; priority: number; reason: string }>;
};

const fetchResumeSkills = async (userId: string): Promise<ResumeSkillRow[]> => {
  const { data, error } = await supabase
    .from('skills')
    .select('skill_name, score, evidence, expertise_level')
    .eq('user_id', userId)
    .eq('source', 'resume');

  if (error) {
    throw new Error(`Failed to fetch resume skills: ${error.message}`);
  }

  return data ?? [];
};

const fetchMarketSkills = async (userId: string): Promise<MarketSkillRow[]> => {
  const { data, error } = await supabase
    .from('skills')
    .select('skill_name, score, evidence')
    .eq('user_id', userId)
    .eq('source', 'market');

  if (error) {
    throw new Error(`Failed to fetch market skills: ${error.message}`);
  }

  return data ?? [];
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

const tokenize = (value: string): string[] => {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
};

const filterMarketSkillsByRole = (
  marketRows: MarketSkillRow[],
  fallbackSkills: string[]
): MarketSkillRow[] => {
  if (fallbackSkills.length === 0) return marketRows;

  const fallbackSet = new Set(fallbackSkills.map((skill) => normalizeSkillName(skill)));
  const fallbackTokens = new Set<string>();
  fallbackSkills.forEach((skill) => {
    tokenize(skill).forEach((token) => fallbackTokens.add(token));
  });

  return marketRows.filter((row) => {
    const name = trimSkillName(row.skill_name ?? '');
    if (!name) return false;
    const normalized = normalizeSkillName(name);
    if (fallbackSet.has(normalized)) return true;
    const tokens = tokenize(name);
    return tokens.some((token) => fallbackTokens.has(token));
  });
};

const deleteExistingGaps = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('gap_skills')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete existing gap skills: ${error.message}`);
  }
};

const insertGaps = async (
  userId: string,
  gaps: Array<{ skill_name: string; priority: number; reason: string }>
): Promise<void> => {
  if (gaps.length === 0) {
    return;
  }

  const rows = gaps.map((gap) => ({
    user_id: userId,
    skill_name: gap.skill_name,
    priority: gap.priority,
    reason: gap.reason
  }));

  const { error } = await supabase.from('gap_skills').insert(rows);

  if (error) {
    throw new Error(`Failed to insert gap skills: ${error.message}`);
  }
};

const dedupeGaps = (
  gaps: Array<{ skill_name: string; priority: number; reason: string }>
): Array<{ skill_name: string; priority: number; reason: string }> => {
  const seen = new Set<string>();
  const output: Array<{ skill_name: string; priority: number; reason: string }> = [];
  for (const gap of gaps) {
    const key = normalizeSkillName(gap.skill_name);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(gap);
  }
  return output;
};

const normalizeGapPriorities = (
  gaps: Array<{ skill_name: string; priority: number; reason: string }>
): Array<{ skill_name: string; priority: number; reason: string }> => {
  if (gaps.length <= 1) return gaps;
  const first = gaps[0]?.priority ?? 1;
  const allSame = gaps.every((gap) => gap.priority === first);
  if (!allSame) return gaps;

  const total = gaps.length - 1;
  return gaps.map((gap, index) => {
    const scaled = total === 0 ? 1 : 1 + Math.round((index / total) * 4);
    const priority = Math.max(1, Math.min(5, scaled));
    return { ...gap, priority };
  });
};

export const runGapAnalysisInternal = async (input: GapAnalysisRequest): Promise<GapResponse> => {
  const { user_id, run_id, limit = 10 } = input;
  const resolvedRunId = await createOrGetRun({ user_id, run_id });

  logger.info('Gap analysis run resolved', { user_id, run_id: resolvedRunId });

  const [resumeRows, marketRowsInitial] = await Promise.all([
    fetchResumeSkills(user_id),
    fetchMarketSkills(user_id)
  ]);

  let marketRows = marketRowsInitial;
  try {
    const dreamRole = await fetchDreamRole(user_id);
    const fallbackSkills = getRoleSkillFallback(dreamRole);
    if (fallbackSkills.length > 0) {
      const filtered = filterMarketSkillsByRole(marketRows, fallbackSkills);
      if (filtered.length > 0 && filtered.length < marketRows.length) {
        logger.info('Filtered market skills to role relevant set', {
          user_id,
          dream_role: dreamRole,
          before: marketRows.length,
          after: filtered.length
        });
        marketRows = filtered;
      }
    }
  } catch (error) {
    logger.warn('Role-based market skill filtering failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  if (marketRows.length < 3) {
    try {
      const dreamRole = await fetchDreamRole(user_id);
      const fallbackSkills = getRoleSkillFallback(dreamRole);
      if (fallbackSkills.length > 0) {
        const existing = new Set(
          marketRows
            .map((row) => normalizeSkillName(row.skill_name ?? ''))
            .filter((name) => name.length > 0)
        );
        const additional = fallbackSkills
          .map((skill) => trimSkillName(skill))
          .filter((skill) => skill.length > 0 && !existing.has(normalizeSkillName(skill)))
          .map((skill) => ({
            skill_name: skill,
            score: 0.65,
            evidence: 'role-fallback'
          }));
        if (additional.length > 0) {
          marketRows = [...marketRows, ...additional];
          logger.info('Augmented market skills with role fallback', {
            user_id,
            dream_role: dreamRole,
            added_count: additional.length
          });
        }
      }
    } catch (error) {
      logger.warn('Role fallback market skills failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  logger.info('Fetched skills', {
    resume_count: resumeRows.length,
    market_count: marketRows.length
  });

  if (marketRows.length === 0) {
    await deleteExistingGaps(user_id);
    return { user_id, run_id: resolvedRunId, inserted_count: 0, gaps: [] };
  }

  const { resumeSkills, marketSkillsDistinct, marketSkillInputSet } = preprocessSkills(
    resumeRows,
    marketRows
  );

  logger.info('Distinct market skills computed', {
    distinct_market_count: marketSkillsDistinct.length
  });

  let gaps = [] as Array<{ skill_name: string; priority: number; reason: string; market_importance: number }>;

  try {
    const geminiOutput = await runGeminiGapAnalysis({
      resumeSkills,
      marketSkills: marketSkillsDistinct,
      marketSkillInputSet
    });
    logger.info('Gemini analysis completed', { status: 'success' });
    gaps = computeGapsFromGemini(geminiOutput);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Gemini error';
    logger.error('Gemini analysis failed, using fallback', { status: 'fallback', error: message });
    gaps = computeGapsDeterministic(resumeSkills, marketSkillsDistinct);
  }

  const limitedGaps = orderAndLimitGaps(gaps, limit).map((gap) => ({
    skill_name: gap.skill_name,
    priority: gap.priority,
    reason: gap.reason
  }));

  const uniqueGaps = normalizeGapPriorities(dedupeGaps(limitedGaps));

  await deleteExistingGaps(user_id);
  await insertGaps(user_id, uniqueGaps);

  logger.info('Gap skills inserted', { inserted_count: uniqueGaps.length });

  return {
    user_id,
    run_id: resolvedRunId,
    inserted_count: uniqueGaps.length,
    gaps: uniqueGaps
  };
};

export const runGapAnalysis = async (req: Request, res: Response): Promise<void> => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }

  try {
    const response = await runGapAnalysisInternal(parsed.data);
    res.status(200).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Gap analysis failed', { error: message });
    res.status(500).json({ error: 'Gap analysis failed', message });
  }
};
