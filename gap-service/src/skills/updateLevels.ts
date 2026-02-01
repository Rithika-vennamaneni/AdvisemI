import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../util/supabase.js';
import { logger } from '../util/logger.js';

const updateSchema = z.object({
  skill_name: z.string().min(1),
  expertise_level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert'])
});

const requestSchema = z.object({
  user_id: z.string().uuid(),
  run_id: z.string().uuid(),
  updates: z.array(updateSchema).min(1)
});

export const updateSkillLevelsHandler = async (req: Request, res: Response): Promise<void> => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }

  const { user_id, run_id, updates } = parsed.data;

  const updated: Array<{ skill_name: string; expertise_level: string }> = [];
  const notFound: string[] = [];

  for (const update of updates) {
    const { data, error } = await supabase
      .from('skills')
      .update({ expertise_level: update.expertise_level })
      .eq('user_id', user_id)
      .eq('run_id', run_id)
      .eq('source', 'resume')
      .eq('skill_name', update.skill_name)
      .select('skill_name, expertise_level');

    if (error) {
      logger.error('Failed to update skill level', { error: error.message, skill_name: update.skill_name });
      continue;
    }

    if (!data || data.length === 0) {
      notFound.push(update.skill_name);
      continue;
    }

    data.forEach((row) => {
      if (!row.skill_name) return;
      updated.push({ skill_name: row.skill_name, expertise_level: row.expertise_level ?? update.expertise_level });
    });
  }

  logger.info('Skill level updates processed', {
    user_id,
    run_id,
    updated_count: updated.length,
    not_found_count: notFound.length
  });

  res.status(200).json({
    updated_count: updated.length,
    updated,
    not_found: notFound
  });
};
