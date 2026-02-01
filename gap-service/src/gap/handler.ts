import { z } from 'zod';
import type { Request, Response } from 'express';
import { supabase } from '../util/supabase.js';
import { logger } from '../util/logger.js';
import { preprocessSkills } from './preprocess.js';
import { runGeminiGapAnalysis } from '../gemini/client.js';
import { computeGapsDeterministic, computeGapsFromGemini, orderAndLimitGaps } from './analysis.js';
import type { MarketSkillRow, ResumeSkillRow } from './types.js';

const requestSchema = z.object({
  user_id: z.string().uuid(),
  run_id: z.string().uuid(),
  limit: z.number().int().min(1).max(100).optional()
});

type GapAnalysisRequest = z.infer<typeof requestSchema>;

type GapResponse = {
  user_id: string;
  run_id: string;
  inserted_count: number;
  gaps: Array<{ skill_name: string; priority: number; reason: string }>;
};

const fetchResumeSkills = async (userId: string, runId: string): Promise<ResumeSkillRow[]> => {
  const { data, error } = await supabase
    .from('skills')
    .select('skill_name, score, evidence, expertise_level')
    .eq('user_id', userId)
    .eq('run_id', runId)
    .eq('source', 'resume');

  if (error) {
    throw new Error(`Failed to fetch resume skills: ${error.message}`);
  }

  return data ?? [];
};

const fetchMarketSkills = async (userId: string, runId: string): Promise<MarketSkillRow[]> => {
  const { data, error } = await supabase
    .from('skills')
    .select('skill_name, score, evidence')
    .eq('user_id', userId)
    .eq('run_id', runId)
    .eq('source', 'market');

  if (error) {
    throw new Error(`Failed to fetch market skills: ${error.message}`);
  }

  return data ?? [];
};

const deleteExistingGaps = async (userId: string, runId: string): Promise<void> => {
  const { error } = await supabase
    .from('gap_skills')
    .delete()
    .eq('user_id', userId)
    .eq('run_id', runId);

  if (error) {
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

  const { error } = await supabase.from('gap_skills').insert(
    gaps.map((gap) => ({
      user_id: userId,
      run_id: runId,
      skill_name: gap.skill_name,
      priority: gap.priority,
      reason: gap.reason
    }))
  );

  if (error) {
    throw new Error(`Failed to insert gap skills: ${error.message}`);
  }
};

export const runGapAnalysis = async (req: Request, res: Response): Promise<void> => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }

  const { user_id, run_id, limit = 15 }: GapAnalysisRequest = parsed.data;

  try {
    const [resumeRows, marketRows] = await Promise.all([
      fetchResumeSkills(user_id, run_id),
      fetchMarketSkills(user_id, run_id)
    ]);

    logger.info('Fetched skills', {
      resume_count: resumeRows.length,
      market_count: marketRows.length
    });

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

    await deleteExistingGaps(user_id, run_id);
    await insertGaps(user_id, run_id, limitedGaps);

    logger.info('Gap skills inserted', { inserted_count: limitedGaps.length });

    const response: GapResponse = {
      user_id,
      run_id,
      inserted_count: limitedGaps.length,
      gaps: limitedGaps
    };

    res.status(200).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Gap analysis failed', { error: message });
    res.status(500).json({ error: 'Gap analysis failed', message });
  }
};
