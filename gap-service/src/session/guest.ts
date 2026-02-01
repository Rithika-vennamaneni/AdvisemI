import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { supabase } from '../util/supabase.js';
import { logger } from '../util/logger.js';

export const createGuestSessionHandler = async (req: Request, res: Response): Promise<void> => {
  const existingId = typeof req.body?.user_id === 'string' ? req.body.user_id : undefined;

  if (existingId) {
    const { data, error } = await supabase.auth.admin.getUserById(existingId);
    if (data?.user?.id) {
      res.status(200).json({ user_id: data.user.id });
      return;
    }
    logger.warn('Provided guest user_id not found', { error: error?.message ?? 'Unknown error' });
  }

  const email = `guest+${randomUUID()}@advisemi.local`;
  const password = randomUUID();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { guest: true }
  });

  if (error || !data?.user?.id) {
    logger.error('Failed to create guest user', { error: error?.message ?? 'Unknown error' });
    res.status(500).json({ error: 'Failed to create guest user' });
    return;
  }

  logger.info('Guest user created', { user_id: data.user.id });
  res.status(200).json({ user_id: data.user.id });
};
