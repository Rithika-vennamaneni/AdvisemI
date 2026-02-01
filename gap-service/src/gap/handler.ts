import { z } from 'zod';
import type { Request, Response } from 'express';
import { supabase } from '../util/supabase.js';
import { logger } from '../util/logger.js';
import { preprocessSkills } from './preprocess.js';
import { runGeminiGapAnalysis } from '../gemini/client.js';
import { computeGapsDeterministic, computeGapsFromGemini, orderAndLimitGaps } from './analysis.js';
import type { MarketSkillRow, ResumeSkillRow } from './types.js';
import { normalizeSkillName } from '../util/strings.js';

const requestSchema = z.object({
  user_id: z.string().uuid(),
  run_id: z.string().uuid(),
  limit: z.number().int().min(1).max(100).optional()
});

export type GapAnalysisRequest = z.infer<typeof requestSchema>;

export type GapResponse = {
  user_id: string;
  run_id: string;
  inserted_count: number;
  gaps: Array<{ skill_name: string; priority: number; reason: string }>;
};

const isMissingRunIdColumn = (message: string | undefined): boolean => {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('run_id') &&
    (lower.includes('does not exist') || lower.includes('could not find') || lower.includes('schema cache'))
  );
};

const fetchResumeSkills = async (userId: string, runId: string): Promise<ResumeSkillRow[]> => {
  const { data, error } = await supabase
    .from('skills')
    .select('skill_name, score, evidence, expertise_level')
    .eq('user_id', userId)
    .eq('run_id', runId)
    .eq('source', 'resume');

  if (error) {
    if (isMissingRunIdColumn(error.message)) {
      logger.warn('skills.run_id column missing, falling back to user_id only', { error: error.message });
    } else {
      throw new Error(`Failed to fetch resume skills: ${error.message}`);
    }
  }

  if (data && data.length > 0) {
    return data;
  }

  logger.warn('No resume skills found for run_id, falling back to user_id', { user_id: userId, run_id: runId });
  const { data: fallback, error: fallbackError } = await supabase
    .from('skills')
    .select('skill_name, score, evidence, expertise_level')
    .eq('user_id', userId)
    .eq('source', 'resume');

  if (fallbackError) {
    throw new Error(`Failed to fetch resume skills (fallback): ${fallbackError.message}`);
  }

  return fallback ?? [];
};

const fetchMarketSkills = async (userId: string, runId: string): Promise<MarketSkillRow[]> => {
  const { data, error } = await supabase
    .from('skills')
    .select('skill_name, score, evidence')
    .eq('user_id', userId)
    .eq('run_id', runId)
    .eq('source', 'market');

  if (error) {
    if (isMissingRunIdColumn(error.message)) {
      logger.warn('skills.run_id column missing, falling back to user_id only', { error: error.message });
    } else {
      throw new Error(`Failed to fetch market skills: ${error.message}`);
    }
  }

  if (data && data.length > 0) {
    return data;
  }

  logger.warn('No market skills found for run_id, falling back to user_id', { user_id: userId, run_id: runId });
  const { data: fallback, error: fallbackError } = await supabase
    .from('skills')
    .select('skill_name, score, evidence')
    .eq('user_id', userId)
    .eq('source', 'market');

  if (fallbackError) {
    throw new Error(`Failed to fetch market skills (fallback): ${fallbackError.message}`);
  }

  return fallback ?? [];
};

const deleteExistingGaps = async (userId: string, runId: string): Promise<void> => {
  const { error } = await supabase
    .from('gap_skills')
    .delete()
    .eq('user_id', userId)
    .eq('run_id', runId);

  if (error) {
    if (isMissingRunIdColumn(error.message)) {
      logger.warn('gap_skills.run_id column missing, deleting by user_id only', { error: error.message });
      const { error: fallbackError } = await supabase
        .from('gap_skills')
        .delete()
        .eq('user_id', userId);
      if (fallbackError) {
        throw new Error(`Failed to delete existing gap skills (fallback): ${fallbackError.message}`);
      }
      return;
    }
    throw new Error(`Failed to delete existing gap skills: ${error.message}`);
  }
};

const insertGaps = async (
  userId: string,
  runId: string,
  gaps: Array<{ skill_name: string; priority: number; reason: string }>
): Promise<void> => {
  if (gaps.length === 0) {
    return;
  }

  const rows = gaps.map((gap) => ({
    user_id: userId,
    run_id: runId,
    skill_name: gap.skill_name,
    priority: gap.priority,
    reason: gap.reason
  }));

  const { error } = await supabase.from('gap_skills').insert(rows);

  if (error) {
    if (isMissingRunIdColumn(error.message)) {
      logger.warn('gap_skills.run_id column missing, inserting without run_id', { error: error.message });
      const fallbackRows = gaps.map((gap) => ({
        user_id: userId,
        skill_name: gap.skill_name,
        priority: gap.priority,
        reason: gap.reason
      }));
      const { error: fallbackError } = await supabase.from('gap_skills').insert(fallbackRows);
      if (fallbackError) {
        throw new Error(`Failed to insert gap skills (fallback): ${fallbackError.message}`);
      }
      return;
    }
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

export const runGapAnalysisInternal = async (input: GapAnalysisRequest): Promise<GapResponse> => {
  const { user_id, run_id, limit = 15 } = input;

  const [resumeRows, marketRows] = await Promise.all([
    fetchResumeSkills(user_id, run_id),
    fetchMarketSkills(user_id, run_id)
  ]);

  logger.info('Fetched skills', {
    resume_count: resumeRows.length,
    market_count: marketRows.length
  });

  if (marketRows.length === 0) {
    await deleteExistingGaps(user_id, run_id);
    return { user_id, run_id, inserted_count: 0, gaps: [] };
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

  const uniqueGaps = dedupeGaps(limitedGaps);

  await deleteExistingGaps(user_id, run_id);
  await insertGaps(user_id, run_id, uniqueGaps);

  logger.info('Gap skills inserted', { inserted_count: uniqueGaps.length });

  return {
    user_id,
    run_id,
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
