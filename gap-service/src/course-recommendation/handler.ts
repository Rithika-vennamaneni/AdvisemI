import { z } from 'zod';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { supabase } from '../util/supabase.js';
import { logger } from '../util/logger.js';
import { fetchCoursesForSubject } from '../uiuc/client.js';
import type { CourseMatchResult } from '../gemini/courseMatchPrompt.js';
import type { GapSkill, CourseRecommendationRequest, CourseRecommendationResponse } from './types.js';
import type { UIUCCourse } from '../uiuc/types.js';
import { ensureMarketSkills } from '../market-skills/agent.js';
import { runGapAnalysisInternal } from '../gap/handler.js';

const requestSchema = z.object({
  user_id: z.string().uuid(),
  run_id: z.string().uuid().optional(),
  year: z.string().regex(/^\d{4}$/),
  semester: z.enum(['spring', 'summer', 'fall']),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

const tokenize = (value: string): string[] => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
};

const normalizeText = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasWord = (text: string, word: string): boolean => {
  if (!word) return false;
  const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
  return pattern.test(text);
};

const SKILL_SYNONYMS: Record<string, string[]> = {
  'machine learning': ['ml'],
  'deep learning': ['dl'],
  'artificial intelligence': ['ai'],
  'natural language processing': ['nlp'],
  'computer vision': ['cv', 'vision'],
  'data visualization': ['visualization', 'viz'],
  'data engineering': ['data pipeline', 'etl', 'data warehouse', 'data warehousing'],
  'data science': ['data scientist'],
  statistics: ['statistical', 'stat'],
  'linear algebra': ['linear', 'algebra'],
  'time series': ['time-series', 'timeseries'],
  'operating systems': ['os'],
  'version control': ['git']
};

const SKILL_KEYWORDS: Record<string, string[]> = {
  'machine learning': ['machine learning', 'supervised', 'unsupervised', 'classification', 'regression', 'ml'],
  'deep learning': ['deep learning', 'neural network', 'cnn', 'rnn', 'transformer', 'dl'],
  statistics: ['statistics', 'probability', 'inference', 'hypothesis', 'bayesian', 'regression'],
  'data visualization': ['data visualization', 'visualization', 'dashboard', 'plot', 'chart', 'tableau', 'power bi'],
  'data mining': ['data mining', 'pattern mining', 'clustering', 'association rules'],
  'data science': ['data science', 'data scientist'],
  'data engineering': ['data engineering', 'etl', 'data pipeline', 'data warehouse', 'warehousing'],
  'feature engineering': ['feature engineering', 'feature extraction'],
  'model evaluation': ['model evaluation', 'cross validation', 'roc', 'precision', 'recall'],
  'time series': ['time series', 'timeseries', 'forecast'],
  'natural language processing': ['natural language processing', 'nlp', 'text mining', 'language model'],
  'computer vision': ['computer vision', 'image processing', 'vision', 'cv'],
  sql: ['sql', 'query', 'relational', 'database', 'postgres', 'mysql'],
  python: ['python'],
  r: ['r programming', 'r'],
  'cloud computing': ['cloud computing', 'aws', 'azure', 'gcp'],
  'distributed systems': ['distributed systems', 'distributed', 'scalability'],
  'system design': ['system design', 'architecture'],
  'version control': ['version control', 'git']
};

const expandTokensForSkill = (skillName: string): string[] => {
  const base = tokenize(skillName);
  const synonyms = SKILL_SYNONYMS[skillName.toLowerCase()] ?? [];
  synonyms.forEach((value) => {
    base.push(...tokenize(value));
  });
  return Array.from(new Set(base));
};

const matchesSkillTokens = (tokens: string[], haystack: string, titleStack: string): boolean => {
  if (tokens.length === 0) return false;
  if (tokens.length === 1) {
    return hasWord(haystack, tokens[0]) || hasWord(titleStack, tokens[0]);
  }

  const bodyHits = tokens.filter((token) => hasWord(haystack, token)).length;
  const titleHits = tokens.filter((token) => hasWord(titleStack, token)).length;
  if (bodyHits >= Math.min(2, tokens.length)) return true;
  return titleHits >= 1 && bodyHits >= 1;
};

const scoreSkillMatch = (
  skillName: string,
  haystack: string,
  titleStack: string
): { matched: boolean; score: number } => {
  const normalizedSkill = skillName.toLowerCase();
  const keywords = SKILL_KEYWORDS[normalizedSkill] ?? [];
  let score = 0;

  keywords.forEach((phrase) => {
    const normalizedPhrase = normalizeText(phrase);
    if (!normalizedPhrase) return;
    if (normalizedPhrase.includes(' ')) {
      if (titleStack.includes(normalizedPhrase)) score += 3;
      else if (haystack.includes(normalizedPhrase)) score += 2;
      return;
    }
    if (hasWord(titleStack, normalizedPhrase)) score += 3;
    else if (hasWord(haystack, normalizedPhrase)) score += 2;
  });

  if (score > 0) {
    return { matched: true, score };
  }

  const tokens = expandTokensForSkill(skillName);
  const matched = matchesSkillTokens(tokens, haystack, titleStack);
  if (!matched) return { matched: false, score: 0 };

  const baseScore = tokens.length >= 2 ? 2 : 1;
  return { matched: true, score: baseScore };
};

const buildFallbackMatch = (course: UIUCCourse, gapSkills: GapSkill[]): CourseMatchResult | null => {
  const haystack = normalizeText(`${course.title ?? ''} ${course.description ?? ''}`);
  const titleStack = normalizeText(course.title ?? '');
  const matched: string[] = [];
  let score = 0;

  gapSkills.forEach((gap) => {
    const matchResult = scoreSkillMatch(gap.skill_name, haystack, titleStack);
    if (!matchResult.matched) return;
    matched.push(gap.skill_name);
    const base = Math.max(1, 6 - gap.priority);
    score += base + matchResult.score;
  });

  if (matched.length === 0) return null;

  const maxScore = Math.max(1, gapSkills.length * 6);
  const matchScore = Math.min(1, score / maxScore);
  const confidence = Math.min(1, 0.4 + matched.length / Math.max(1, gapSkills.length));
  const list = matched.slice(0, 3).join(', ');
  const explanation = `Builds ${list} through topics covered in ${course.subject} ${course.number} and related coursework.`;

  return {
    match_score: matchScore,
    matched_gaps: matched,
    explanation,
    confidence
  };
};

const fetchGapSkills = async (userId: string): Promise<GapSkill[]> => {
  const { data, error } = await supabase
    .from('gap_skills')
    .select('id, user_id, skill_name, priority, reason')
    .eq('user_id', userId)
    .order('priority', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch gap skills: ${error.message}`);
  }

  return (data || []) as GapSkill[];
};

const SUBJECT_RULES: Array<{ subject: string; patterns: RegExp[] }> = [
  { subject: 'STAT', patterns: [/stat|statistics|probability|bayes|regression|hypothesis|inference/i] },
  { subject: 'MATH', patterns: [/math|calculus|linear algebra|optimization|numerical/i] },
  { subject: 'CS', patterns: [/machine learning|ml|ai|algorithm|data structure|software|programming|python|java|c\+\+|database|sql|system|distributed|cloud|security|network|operating/i] },
  { subject: 'ECE', patterns: [/signal|hardware|embedded|circuit|robot|control|iot|computer vision/i] },
  { subject: 'IS', patterns: [/information|analytics|visualization|bi|business intelligence|data warehouse|etl|data pipeline/i] },
  { subject: 'INFO', patterns: [/information|data management|ux|hci/i] },
  { subject: 'BADM', patterns: [/business|management|product|strategy|finance|accounting/i] },
  { subject: 'ECON', patterns: [/economics|econometric|market/i] }
];

const selectRelevantSubjects = async (gapSkills: GapSkill[]): Promise<string[]> => {
  if (gapSkills.length === 0) {
    return [];
  }

  const scores = new Map<string, number>();
  gapSkills.forEach((gap) => {
    const text = gap.skill_name.toLowerCase();
    SUBJECT_RULES.forEach((rule) => {
      if (rule.patterns.some((pattern) => pattern.test(text))) {
        scores.set(rule.subject, (scores.get(rule.subject) ?? 0) + Math.max(1, 6 - gap.priority));
      }
    });
  });

  const subjects = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([subject]) => subject)
    .slice(0, 8);

  const fallback = ['CS', 'STAT', 'MATH', 'IS'];
  return subjects.length > 0 ? subjects : fallback;
};

const upsertCourse = async (course: UIUCCourse, year: string, semester: string): Promise<string> => {
  const term = `${year}-${semester}`;

  const { data, error } = await supabase
    .from('courses')
    .upsert(
      {
        subject: course.subject,
        number: course.number,
        title: course.title,
        description: course.description || null,
        term,
        course_url: course.courseUrl,
        last_synced: new Date().toISOString(),
      },
      {
        onConflict: 'term,subject,number',
      }
    )
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to upsert course: ${error.message}`);
  }

  return data.id;
};

const insertRecommendations = async (
  userId: string,
  recommendations: Array<{
    courseId: string;
    score: number;
    matchedGaps: string[];
    explanation: string;
  }>
): Promise<void> => {
  if (recommendations.length === 0) {
    return;
  }

  const rows = recommendations.map((rec) => ({
    user_id: userId,
    course_id: rec.courseId,
    score: rec.score,
    matched_gaps: rec.matchedGaps,
    explanation: rec.explanation,
  }));

  const { error } = await supabase.from('recommendations').insert(rows);

  if (error) {
    throw new Error(`Failed to insert recommendations: ${error.message}`);
  }
};

const deleteExistingRecommendations = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('recommendations')
    .delete()
    .eq('user_id', userId);

  if (error) {
    logger.warn('Failed to delete existing recommendations', { error: error.message });
    // Don't throw - continue with insertion
  }
};

export const generateCourseRecommendations = async (req: Request, res: Response): Promise<void> => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }

  const { user_id, run_id, year, semester, limit }: CourseRecommendationRequest = parsed.data;
  const resolvedRunId = run_id ?? randomUUID();

  try {
    logger.info('Starting course recommendation generation', { user_id, run_id: resolvedRunId, year, semester });

    // Step 1: Ensure market skills (if missing) and run gap analysis if needed
    try {
      await ensureMarketSkills(user_id);
    } catch (error) {
      logger.warn('Market skill extraction skipped', { error: error instanceof Error ? error.message : 'Unknown' });
    }

    let gapSkills = await fetchGapSkills(user_id);
    if (gapSkills.length < 3) {
      await runGapAnalysisInternal({ user_id, run_id: resolvedRunId, limit: 15 });
      gapSkills = await fetchGapSkills(user_id);
    }

    // Step 2: Fetch gap skills
    if (gapSkills.length === 0) {
      res.status(200).json({
        user_id,
        run_id: resolvedRunId,
        courses_found: 0,
        recommendations_created: 0,
        recommendations: [],
      });
      return;
    }

    logger.info('Fetched gap skills', { count: gapSkills.length });

    // Step 3: Use Gemini to identify relevant subjects
    const relevantSubjects = await selectRelevantSubjects(gapSkills);
    if (relevantSubjects.length === 0) {
      res.status(200).json({
        user_id,
        run_id: resolvedRunId,
        courses_found: 0,
        recommendations_created: 0,
        recommendations: [],
      });
      return;
    }

    // Step 4: Fetch courses from UIUC API (in parallel for each subject)
    logger.info('Fetching courses from UIUC API', { subjects: relevantSubjects });
    const MAX_CONCURRENT_SUBJECTS = 3;
    const queue = [...relevantSubjects];
    const courseArrays: UIUCCourse[][] = [];

    const workers = Array.from({ length: Math.min(MAX_CONCURRENT_SUBJECTS, queue.length) }, async () => {
      while (queue.length > 0) {
        const subject = queue.shift();
        if (!subject) break;
        const courses = await fetchCoursesForSubject(year, semester, subject);
        courseArrays.push(courses);
      }
    });

    await Promise.all(workers);
    const allCourses = courseArrays.flat();
    
    logger.info('Fetched courses from UIUC', { count: allCourses.length });

    if (allCourses.length === 0) {
      res.status(200).json({
        user_id,
        run_id: resolvedRunId,
        courses_found: 0,
        recommendations_created: 0,
        recommendations: [],
      });
      return;
    }

    // Step 5: Match courses to gap skills using deterministic matching
    logger.info('Matching courses to gap skills', { coursesCount: allCourses.length });
    const courseMatches = allCourses
      .map((course) => ({
        course,
        match: buildFallbackMatch(course, gapSkills),
      }))
      .filter((item) => item.match !== null) as Array<{
      course: UIUCCourse;
      match: CourseMatchResult;
    }>;

    logger.info('Matched courses', { matchedCount: courseMatches.length });

    // Step 6: Rank and limit recommendations
    const rankedMatches = courseMatches
      .sort((a, b) => {
        // Sort by match score (descending), then by number of matched gaps
        if (Math.abs(a.match.match_score - b.match.match_score) > 0.01) {
          return b.match.match_score - a.match.match_score;
        }
        return b.match.matched_gaps.length - a.match.matched_gaps.length;
      })
      .slice(0, limit);

    // Step 7: Store courses and recommendations
    logger.info('Storing courses and recommendations', { count: rankedMatches.length });

    // Delete existing recommendations first
    await deleteExistingRecommendations(user_id);

    // Upsert courses and collect course IDs
    const courseIdPromises = rankedMatches.map((item) =>
      upsertCourse(item.course, year, semester)
    );
    const courseIds = await Promise.all(courseIdPromises);

    // Insert recommendations
    const recommendationsToInsert = rankedMatches.map((item, index) => ({
      courseId: courseIds[index],
      score: item.match.match_score,
      matchedGaps: item.match.matched_gaps,
      explanation: item.match.explanation,
    }));

    await insertRecommendations(user_id, recommendationsToInsert);

    logger.info('Course recommendations generated successfully', {
      coursesFound: allCourses.length,
      recommendationsCreated: recommendationsToInsert.length,
    });

    // Step 8: Return response
    const response: CourseRecommendationResponse = {
      user_id,
      run_id: resolvedRunId,
      courses_found: allCourses.length,
      recommendations_created: recommendationsToInsert.length,
      recommendations: rankedMatches.map((item, index) => ({
        course_id: courseIds[index],
        course: {
          subject: item.course.subject,
          number: item.course.number,
          title: item.course.title,
        },
        score: item.match.match_score,
        matched_gaps: item.match.matched_gaps,
        explanation: item.match.explanation,
      })),
    };

    res.status(200).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Course recommendation generation failed', { error: message, user_id, run_id: resolvedRunId });
    res.status(500).json({ error: 'Course recommendation generation failed', message });
  }
};
