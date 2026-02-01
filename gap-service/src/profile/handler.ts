import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../util/supabase.js';
import { logger } from '../util/logger.js';
import { resolveUserId } from '../util/auth.js';
import { ensureMarketSkills } from '../market-skills/agent.js';
import { runGapAnalysisInternal } from '../gap/handler.js';
import { createOrGetRun } from '../resume-parser/persist.js';

const requestSchema = z.object({
  user_id: z.string().uuid().optional(),
  dream_role: z.string().min(1),
  term: z.string().min(1).optional()
});

export const saveProfileHandler = async (req: Request, res: Response): Promise<void> => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }

  const { user_id, dream_role, term } = parsed.data;
  logger.info('Profile save request', { user_id, dream_role, term });
  const resolvedUserId = await resolveUserId(user_id);
  if (!resolvedUserId) {
    res.status(400).json({ error: 'user_id is required to save profile' });
    return;
  }

  const trimmedRole = dream_role.trim();
  const trimmedTerm = term?.trim() || null;

  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', resolvedUserId)
    .maybeSingle();

  if (selectError && selectError.code !== 'PGRST116') {
    logger.error('Failed to lookup profile', { error: selectError.message });
    res.status(500).json({ error: 'Failed to lookup profile' });
    return;
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        dream_role: trimmedRole,
        term: trimmedTerm
      })
      .eq('id', existing.id);

    if (updateError) {
      logger.error('Failed to update profile', { error: updateError.message });
      res.status(500).json({ error: 'Failed to update profile' });
      return;
    }
  } else {
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        user_id: resolvedUserId,
        dream_role: trimmedRole,
        term: trimmedTerm
      });

    if (insertError) {
      logger.error('Failed to insert profile', { error: insertError.message });
      res.status(500).json({ error: 'Failed to insert profile' });
      return;
    }
  }

  logger.info('Profile saved', { user_id: resolvedUserId, dream_role: trimmedRole, term: trimmedTerm });
  try {
    const { count: resumeCount, error: resumeError } = await supabase
      .from('skills')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', resolvedUserId)
      .eq('source', 'resume');
    if (resumeError) {
      logger.warn('Failed to count resume skills after profile save', { error: resumeError.message });
    } else if ((resumeCount ?? 0) > 0) {
      logger.info('Triggering gap analysis after profile save', {
        user_id: resolvedUserId,
        resume_count: resumeCount
      });
      const resolvedRunId = await createOrGetRun({ user_id: resolvedUserId, dream_role: trimmedRole, term: trimmedTerm });
      try {
        await ensureMarketSkills(resolvedUserId);
      } catch (error) {
        logger.warn('Market skill extraction failed after profile save', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      try {
        const gapResult = await runGapAnalysisInternal({
          user_id: resolvedUserId,
          run_id: resolvedRunId,
          limit: 10
        });
        logger.info('Gap analysis completed after profile save', {
          user_id: resolvedUserId,
          run_id: gapResult.run_id,
          inserted_count: gapResult.inserted_count
        });
      } catch (error) {
        logger.warn('Gap analysis failed after profile save', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      logger.info('Skipping gap analysis after profile save (no resume skills)', { user_id: resolvedUserId });
    }
  } catch (error) {
    logger.warn('Post-profile gap analysis check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  res.status(200).json({ user_id: resolvedUserId, dream_role: trimmedRole, term: trimmedTerm });
};
