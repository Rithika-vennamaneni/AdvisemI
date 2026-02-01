import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { env } from '../env.js';
import { logger } from '../util/logger.js';
import { safeJsonParse } from '../util/json.js';

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

const listAvailableModels = async (): Promise<string[]> => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${env.GEMINI_API_KEY}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`ListModels failed (${res.status})`);
    }
    const data = (await res.json()) as {
      models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
    };
    const models = data.models ?? [];
    return models
      .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
      .map((model) => model.name ?? '')
      .filter((name) => name.length > 0)
      .map((name) => name.replace('models/', ''));
  } finally {
    clearTimeout(timeout);
  }
};

const generateWithModel = async (modelName: string, prompt: string): Promise<string> => {
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  return result.response.text();
};

const runGeminiJson = async (prompt: string): Promise<unknown | null> => {
  try {
    let raw: string;
    try {
      raw = await generateWithModel(env.MODEL, prompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('404') && !message.includes('not found')) {
        throw error;
      }
      logger.warn('Gemini model not found, listing available models', { preferred: env.MODEL });
      const available = await listAvailableModels();
      if (available.length === 0) {
        throw error;
      }
      logger.warn('Using fallback Gemini model', { model: available[0] });
      raw = await generateWithModel(available[0], prompt);
    }

    const parsed = safeJsonParse<unknown>(raw);
    if (!parsed.ok) {
      logger.warn('Gemini JSON parse failed', { error: parsed.error });
      return null;
    }
    return parsed.value;
  } catch (error) {
    logger.warn('Gemini request failed', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
};

export const extractCandidateSkills = async (resumeText: string): Promise<string[] | null> => {
  const maxChars = 8000;
  const sliced = resumeText.slice(0, maxChars);
  const prompt = buildCandidatePrompt(sliced);
  const result = await runGeminiJson(prompt);
  if (!result) return null;
  const validated = skillsListSchema.safeParse(result);
  if (!validated.success) {
    logger.warn('Gemini candidate validation failed', { error: validated.error.message });
    return null;
  }
  return sanitizeList(validated.data.skills, 30);
};

export const selectTopSkills = async (targetRole: string, candidates: string[]): Promise<string[] | null> => {
  if (candidates.length === 0) return [];
  const prompt = buildTopPrompt(targetRole, candidates);
  const result = await runGeminiJson(prompt);
  if (!result) return null;
  const validated = skillsListSchema.safeParse(result);
  if (!validated.success) {
    logger.warn('Gemini top skills validation failed', { error: validated.error.message });
    return null;
  }
  return sanitizeList(validated.data.skills, 10);
};
