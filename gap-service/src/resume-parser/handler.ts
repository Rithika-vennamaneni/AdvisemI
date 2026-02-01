import type { Request, Response } from 'express';
import { z } from 'zod';
import { categorizeSkills, extractCanonicalSkills } from './skills.js';
import { parsePdfBuffer } from './parser.js';
import { logger } from '../util/logger.js';
import { resolveUserId } from '../util/auth.js';
import { createOrGetRun, saveResumeDocument, saveResumeSkills } from './persist.js';
import { extractCandidateSkills, selectTopSkills } from './llm.js';
import { supabase } from '../util/supabase.js';
import type { ResumeParseResult } from './types.js';
import { groupLearningSkills } from '../util/learningSkills.js';
import { normalizeSkillName } from '../util/strings.js';
import { ensureMarketSkills } from '../market-skills/agent.js';
import { runGapAnalysisInternal } from '../gap/handler.js';

const isPdf = (mimetype?: string): boolean => {
  if (!mimetype) return false;
  return mimetype === 'application/pdf' || mimetype.includes('pdf');
};

type MulterRequest = Request & { file?: Express.Multer.File };

const dedupeSkills = (skills: string[], limit = 10): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const skill of skills) {
    const trimmed = skill.trim();
    if (!trimmed) continue;
    const key = normalizeSkillName(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(trimmed);
    if (output.length >= limit) break;
  }
  return output;
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
    let resolvedRole = dream_role;
    if (!resolvedRole && resolvedUserId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('dream_role')
        .eq('user_id', resolvedUserId)
        .maybeSingle();
      if (profileError) {
        logger.warn('Failed to load profile dream_role', { error: profileError.message });
      }
      resolvedRole = profile?.dream_role ?? undefined;
    }

    const candidateSkills = await extractCandidateSkills(text);
    let topSkills: string[] | null = null;

    if (candidateSkills && candidateSkills.length > 0) {
      const roleForPrompt =
        resolvedRole && resolvedRole.trim().length > 0 ? resolvedRole : 'the target role';
      topSkills = await selectTopSkills(roleForPrompt, candidateSkills);
    }

    if (!topSkills || topSkills.length === 0) {
      const fallback = extractCanonicalSkills(text);
      const fallbackList = Object.values(fallback).flat();
      topSkills = fallbackList.slice(0, 10);
    }

    const finalTopSkills = dedupeSkills(topSkills ?? [], 10);
    const canonical_skills = categorizeSkills(finalTopSkills);
    const learning_skills = groupLearningSkills(finalTopSkills);
    const response: ResumeParseResult = {
      education: [],
      work_experience: [],
      projects: [],
      canonical_skills,
      top_skills: finalTopSkills,
      learning_skills
    };

    logger.info('Resume parsed', {
      bytes: request.file.size,
      candidate_skills: candidateSkills?.length ?? 0,
      top_skills: finalTopSkills.length,
      skills_found: Object.values(canonical_skills).reduce((sum, skills) => sum + skills.length, 0)
    });

    let saved = { run_id: null as string | null, documents_saved: 0, skills_saved: 0 };

    if (resolvedUserId) {
      const resolvedRunId = await createOrGetRun({
        user_id: resolvedUserId,
        dream_role: resolvedRole,
        term,
        run_id
      });

      await saveResumeDocument({
        user_id: resolvedUserId,
        raw_text: text
      });

      const skillRows = finalTopSkills.map((skill) => ({ skill_name: skill }));

      const skillsSaved = await saveResumeSkills({
        user_id: resolvedUserId,
        dream_role: resolvedRole,
        skills: skillRows
      });

      logger.info('Resume skills persisted', {
        user_id: resolvedUserId,
        run_id: resolvedRunId,
        skills_saved: skillsSaved
      });

      saved = { run_id: resolvedRunId, documents_saved: 1, skills_saved: skillsSaved };

      if (resolvedRole && resolvedRole.trim().length > 0) {
        logger.info('Triggering gap analysis after resume parse', {
          user_id: resolvedUserId,
          run_id: resolvedRunId,
          dream_role: resolvedRole
        });
        try {
          await ensureMarketSkills(resolvedUserId);
        } catch (error) {
          logger.warn('Market skill extraction failed during resume parse', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        try {
          const gapResult = await runGapAnalysisInternal({
            user_id: resolvedUserId,
            run_id: resolvedRunId,
            limit: 10
          });
          logger.info('Gap analysis completed after resume parse', {
            user_id: resolvedUserId,
            run_id: gapResult.run_id,
            inserted_count: gapResult.inserted_count
          });
        } catch (error) {
          logger.warn('Gap analysis failed after resume parse', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        logger.warn('Skipping gap analysis after resume parse (missing dream_role)', {
          user_id: resolvedUserId,
          run_id: resolvedRunId
        });
      }
    } else {
      logger.warn('Resume parsed without persistence (missing user_id)');
      res.status(400).json({ detail: 'user_id is required to persist resume data' });
      return;
    }

    res.status(200).json({ ...response, user_id: resolvedUserId, ...saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse error';
    logger.error('Resume parse failed', { error: message });
    res.status(500).json({ detail: `Resume parse failed: ${message}` });
  }
};
