import { supabase } from './supabase.js';
import { logger } from './logger.js';

export const resolveUserId = async (providedUserId?: string): Promise<string | null> => {
  if (!providedUserId) {
    return null;
  }

  const { data, error } = await supabase.auth.admin.getUserById(providedUserId);
  if (data?.user?.id) {
    return data.user.id;
  }

  logger.warn('Provided user_id not found', { error: error?.message ?? 'Unknown error' });
  return null;
};
