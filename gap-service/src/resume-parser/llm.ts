import { z } from 'zod';
import { logger } from '../util/logger.js';
import { safeJsonParse } from '../util/json.js';
import { runOpenAI } from '../util/openai.js';

const skillsListSchema = z.object({
  skills: z.array(z.string()).max(50)
});

const buildCandidatePrompt = (text: string): string => {
  return [
    'Extract concrete, course-searchable skills explicitly mentioned in the resume.',
    'Return STRICT JSON only. No markdown or explanations.',
    'Schema: {"skills":["string"]}',
    'Rules:',
    '- Only include concrete technologies, tools, frameworks, certifications, or domain skills.',
    '- Exclude generic responsibilities, soft phrases, companies, locations, or vague nouns.',
    '- Use concise canonical names (e.g., PostgreSQL, FastAPI, AWS, Git).',
    '- Deduplicate.',
    '- Return at most 30 skills.',
    '',
    'Resume text:',
    text
  ].join('\n');
};

const buildTopPrompt = (targetRole: string, candidates: string[]): string => {
  return [
    'Select the TOP 10 skills to improve for the target role.',
    'Return STRICT JSON only. No markdown or explanations.',
    'Schema: {"skills":["string"]}',
    'Rules:',
    '- Choose up to 10 total.',
    '- Skills must come from the candidate list.',
    '- Must be relevant to the target role and worth strengthening.',
    '- Exclude vague, generic, or non-course-searchable items.',
    '- Deduplicate and use canonical names.',
    '',
    'Target role:',
    targetRole,
    '',
    'Candidate skills:',
    candidates.join(', ')
  ].join('\n');
};

const sanitizeList = (items: string[], limit: number): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(trimmed);
    if (output.length >= limit) break;
  }
  return output;
};

const runOpenAIJson = async (prompt: string): Promise<unknown | null> => {
  try {
    const raw = await runOpenAI({
      input: prompt,
      jsonObject: true,
      maxOutputTokens: 400,
      temperature: 0.2
    });

    const parsed = safeJsonParse<unknown>(raw);
    if (!parsed.ok) {
      logger.warn('OpenAI JSON parse failed', { error: parsed.error });
      return null;
    }
    return parsed.value;
  } catch (error) {
    logger.warn('OpenAI request failed', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
};

export const extractCandidateSkills = async (resumeText: string): Promise<string[] | null> => {
  const maxChars = 8000;
  const sliced = resumeText.slice(0, maxChars);
  const prompt = buildCandidatePrompt(sliced);
  const result = await runOpenAIJson(prompt);
  if (!result) return null;
  const validated = skillsListSchema.safeParse(result);
  if (!validated.success) {
    logger.warn('OpenAI candidate validation failed', { error: validated.error.message });
    return null;
  }
  return sanitizeList(validated.data.skills, 30);
};

export const selectTopSkills = async (targetRole: string, candidates: string[]): Promise<string[] | null> => {
  if (candidates.length === 0) return [];
  const prompt = buildTopPrompt(targetRole, candidates);
  const result = await runOpenAIJson(prompt);
  if (!result) return null;
  const validated = skillsListSchema.safeParse(result);
  if (!validated.success) {
    logger.warn('OpenAI top skills validation failed', { error: validated.error.message });
    return null;
  }
  return sanitizeList(validated.data.skills, 10);
};
