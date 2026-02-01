import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { extractCanonicalSkills } from './skills.js';
import { parsePdfBuffer } from './parser.js';
import { logger } from '../util/logger.js';
import { env } from '../env.js';
import { supabase } from '../util/supabase.js';
import { createOrGetRun, saveResumeDocument, saveResumeSkills } from './persist.js';
import type { ResumeParseResult } from './types.js';

const isPdf = (mimetype?: string): boolean => {
  if (!mimetype) return false;
  return mimetype === 'application/pdf' || mimetype.includes('pdf');
};

type MulterRequest = Request & { file?: Express.Multer.File };

const findUserIdByEmail = async (email: string): Promise<string | null> => {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    logger.warn('Failed to list users for email lookup', { error: error.message });
    return null;
  }
  const matched = data.users.find((user) => user.email === email);
  return matched?.id ?? null;
};

const resolveUserId = async (userId?: string): Promise<string | null> => {
  if (userId) return userId;

  if (env.DEFAULT_USER_ID) {
    const { data, error } = await supabase.auth.admin.getUserById(env.DEFAULT_USER_ID);
    if (data?.user?.id) {
      return data.user.id;
    }
    if (error) {
      logger.warn('DEFAULT_USER_ID not found', { error: error.message });
    }
  }

  const email = env.DEFAULT_USER_EMAIL ?? `dev+${randomUUID()}@example.com`;
  const password = env.DEFAULT_USER_PASSWORD ?? randomUUID();

  const existingId = await findUserIdByEmail(email);
  if (existingId) {
    logger.warn('Using existing fallback user', { user_id: existingId });
    return existingId;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (error || !data?.user?.id) {
    logger.error('Failed to create fallback user', { error: error?.message ?? 'Unknown error' });
    return null;
  }

  logger.warn('Created fallback user for resume persistence', { user_id: data.user.id });
  return data.user.id;
};

export const parseResumeHandler = async (req: Request, res: Response): Promise<void> => {
  const request = req as MulterRequest;
  const bodySchema = z.object({
    user_id: z.string().uuid().optional(),
    run_id: z.string().uuid().optional(),
    dream_role: z.string().min(1).optional(),
    term: z.string().min(1).optional()
  });
  const parsedBody = bodySchema.safeParse(request.body ?? {});
  if (!parsedBody.success) {
    res.status(400).json({ detail: 'Invalid request metadata', issues: parsedBody.error.flatten() });
    return;
  }

  const { user_id, run_id, dream_role, term } = parsedBody.data;
  const resolvedUserId = await resolveUserId(user_id);

  if (!request.file) {
    res.status(400).json({ detail: 'Missing file upload.' });
    return;
  }

  if (!isPdf(request.file.mimetype)) {
    res.status(415).json({ detail: 'Only PDF resumes are supported.' });
    return;
  }

  try {
    const text = await parsePdfBuffer(request.file.buffer);
    const canonical_skills = extractCanonicalSkills(text);
    const response: ResumeParseResult = {
      education: [],
      work_experience: [],
      projects: [],
      canonical_skills
    };

    logger.info('Resume parsed', {
      bytes: request.file.size,
      skills_found: Object.values(canonical_skills).reduce((sum, skills) => sum + skills.length, 0)
    });

    let saved = { run_id: null as string | null, documents_saved: 0, skills_saved: 0 };

    if (resolvedUserId) {
      const resolvedRunId = await createOrGetRun({
        user_id: resolvedUserId,
        dream_role,
        term,
        run_id
      });

      await saveResumeDocument({
        user_id: resolvedUserId,
        run_id: resolvedRunId,
        raw_text: text
      });

      const skillRows = Object.values(canonical_skills)
        .flat()
        .map((skill) => ({ skill_name: skill }));

      const skillsSaved = await saveResumeSkills({
        user_id: resolvedUserId,
        run_id: resolvedRunId,
        dream_role,
        skills: skillRows
      });

      saved = { run_id: resolvedRunId, documents_saved: 1, skills_saved: skillsSaved };
    } else {
      logger.warn('Resume parsed without persistence (missing user_id)');
    }

    res.status(200).json({ ...response, user_id: resolvedUserId, ...saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse error';
    logger.error('Resume parse failed', { error: message });
    res.status(500).json({ detail: 'Resume parse failed.' });
  }
};
