import type { Request, Response } from 'express';
import { extractCanonicalSkills } from './skills.js';
import { parsePdfBuffer } from './parser.js';
import { logger } from '../util/logger.js';
import type { ResumeParseResult } from './types.js';

const isPdf = (mimetype?: string): boolean => {
  if (!mimetype) return false;
  return mimetype === 'application/pdf' || mimetype.includes('pdf');
};

type MulterRequest = Request & { file?: Express.Multer.File };

export const parseResumeHandler = async (req: Request, res: Response): Promise<void> => {
  const request = req as MulterRequest;
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

    res.status(200).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse error';
    logger.error('Resume parse failed', { error: message });
    res.status(500).json({ detail: 'Resume parse failed.' });
  }
};
