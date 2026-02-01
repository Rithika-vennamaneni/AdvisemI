import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../util/supabase.js';
import { logger } from '../util/logger.js';
import { resolveUserId } from '../util/auth.js';

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
  res.status(200).json({ user_id: resolvedUserId, dream_role: trimmedRole, term: trimmedTerm });
};
