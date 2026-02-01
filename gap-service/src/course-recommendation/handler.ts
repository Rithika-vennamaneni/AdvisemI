import { z } from 'zod';
import type { Request, Response } from 'express';
import { supabase } from '../util/supabase.js';
import { logger } from '../util/logger.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../env.js';
import { safeJsonParse } from '../util/json.js';
import { fetchSubjects, fetchCoursesForSubject } from '../uiuc/client.js';
import { buildSubjectSelectionPrompt, type SubjectSelectionResult } from '../gemini/subjectPrompt.js';
import { buildCourseMatchPrompt, type CourseMatchResult } from '../gemini/courseMatchPrompt.js';
import type { GapSkill, CourseRecommendationRequest, CourseRecommendationResponse } from './types.js';
import type { UIUCCourse } from '../uiuc/types.js';
import { ensureMarketSkills } from '../market-skills/agent.js';
import { runGapAnalysisInternal } from '../gap/handler.js';

const requestSchema = z.object({
  user_id: z.string().uuid(),
  run_id: z.string().uuid(),
  year: z.string().regex(/^\d{4}$/),
  semester: z.enum(['spring', 'summer', 'fall']),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

const isMissingRunIdColumn = (message: string | undefined): boolean => {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('run_id') &&
    (lower.includes('does not exist') || lower.includes('could not find') || lower.includes('schema cache'))
  );
};

const listAvailableModels = async (): Promise<string[]> => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${env.GEMINI_API_KEY}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`ListModels failed (${res.status})`);
    }
    const data = (await res.json()) as {
      models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
    };
    const models = data.models ?? [];
    return models
      .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
      .map((model) => model.name ?? '')
      .filter((name) => name.length > 0)
      .map((name) => name.replace('models/', ''));
  } finally {
    clearTimeout(timeout);
  }
};

const generateWithModel = async (modelName: string, prompt: string): Promise<string> => {
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  return result.response.text();
};

const callGemini = async (prompt: string): Promise<string> => {
  try {
    return await generateWithModel(env.MODEL, prompt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('404') && !message.includes('not found')) {
      throw error;
    }
    logger.warn('Gemini model not found, listing available models', { preferred: env.MODEL });
    const available = await listAvailableModels();
    if (available.length === 0) {
      throw error;
    }
    logger.warn('Using fallback Gemini model', { model: available[0] });
    return await generateWithModel(available[0], prompt);
  }
};

const tokenize = (value: string): string[] => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
};

const buildFallbackMatch = (course: UIUCCourse, gapSkills: GapSkill[]): CourseMatchResult | null => {
  const haystack = `${course.title ?? ''} ${course.description ?? ''}`.toLowerCase();
  const titleStack = (course.title ?? '').toLowerCase();
  const matched: string[] = [];
  let score = 0;

  gapSkills.forEach((gap) => {
    const tokens = tokenize(gap.skill_name);
    if (tokens.length === 0) return;
    const allInText = tokens.every((token) => haystack.includes(token));
    if (!allInText) return;
    matched.push(gap.skill_name);
    const base = Math.max(1, 6 - gap.priority);
    const titleMatch = tokens.every((token) => titleStack.includes(token));
    score += base + (titleMatch ? 1 : 0);
  });

  if (matched.length === 0) return null;

  const maxScore = Math.max(1, gapSkills.length * 6);
  const matchScore = Math.min(1, score / maxScore);
  const confidence = Math.min(1, 0.4 + matched.length / Math.max(1, gapSkills.length));
  const list = matched.slice(0, 3).join(', ');
  const explanation = `Addresses gaps in ${list} through coursework that aligns with these skills.`;

  return {
    match_score: matchScore,
    matched_gaps: matched,
    explanation,
    confidence
  };
};

const fetchGapSkills = async (userId: string, runId: string): Promise<GapSkill[]> => {
  const { data, error } = await supabase
    .from('gap_skills')
    .select('id, user_id, skill_name, priority, reason, run_id')
    .eq('user_id', userId)
    .eq('run_id', runId)
    .order('priority', { ascending: true });

  if (error) {
    if (isMissingRunIdColumn(error.message)) {
      logger.warn('gap_skills.run_id column missing, falling back to user_id only', { error: error.message });
    } else {
      throw new Error(`Failed to fetch gap skills: ${error.message}`);
    }
  }

  if (data && data.length > 0) {
    return data as GapSkill[];
  }

  const { data: fallback, error: fallbackError } = await supabase
    .from('gap_skills')
    .select('id, user_id, skill_name, priority, reason')
    .eq('user_id', userId)
    .order('priority', { ascending: true });

  if (fallbackError) {
    throw new Error(`Failed to fetch gap skills (fallback): ${fallbackError.message}`);
  }

  return (fallback || []) as GapSkill[];
};

const selectRelevantSubjects = async (gapSkills: GapSkill[]): Promise<string[]> => {
  if (gapSkills.length === 0) {
    return [];
  }

  const prompt = buildSubjectSelectionPrompt(gapSkills);
  logger.info('Calling Gemini for subject selection', { gapSkillsCount: gapSkills.length });

  try {
    const responseText = await callGemini(prompt);
    const parsed = safeJsonParse<SubjectSelectionResult>(responseText);

    if (!parsed.ok) {
      logger.warn('Failed to parse subject selection response', { error: parsed.error });
      // Fallback to common technical subjects
      return ['CS', 'ECE', 'MATH', 'STAT'];
    }

    const subjects = parsed.value.relevant_subjects
      .filter((s) => s.relevance_score > 0.3)
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .map((s) => s.subject_code.toUpperCase())
      .slice(0, 10); // Limit to top 10

    logger.info('Selected relevant subjects', { subjects, count: subjects.length });
    return subjects.length > 0 ? subjects : ['CS', 'ECE', 'MATH', 'STAT'];
  } catch (error) {
    logger.error('Subject selection failed', { error: error instanceof Error ? error.message : 'Unknown' });
    // Fallback to common technical subjects
    return ['CS', 'ECE', 'MATH', 'STAT'];
  }
};

const matchCourseToSkills = async (
  course: UIUCCourse,
  gapSkills: GapSkill[]
): Promise<CourseMatchResult | null> => {
  const prompt = buildCourseMatchPrompt(gapSkills, course);
  
  try {
    const responseText = await callGemini(prompt);
    const parsed = safeJsonParse<CourseMatchResult>(responseText);

    if (!parsed.ok) {
      logger.warn('Failed to parse course match response', { 
        course: `${course.subject} ${course.number}`,
        error: parsed.error 
      });
      return buildFallbackMatch(course, gapSkills);
    }

    const result = parsed.value;
    
    // Only return matches with reasonable confidence and score
    if (result.match_score < 0.3 || result.confidence < 0.4) {
      return null;
    }

    return result;
  } catch (error) {
    logger.warn('Course matching failed', { 
      course: `${course.subject} ${course.number}`,
      error: error instanceof Error ? error.message : 'Unknown' 
    });
    return buildFallbackMatch(course, gapSkills);
  }
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
  runId: string,
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
    run_id: runId,
    course_id: rec.courseId,
    score: rec.score,
    matched_gaps: rec.matchedGaps,
    explanation: rec.explanation,
  }));

  const { error } = await supabase.from('recommendations').insert(rows);

  if (error) {
    if (isMissingRunIdColumn(error.message)) {
      logger.warn('recommendations.run_id column missing, inserting without run_id', { error: error.message });
      const fallbackRows = recommendations.map((rec) => ({
        user_id: userId,
        course_id: rec.courseId,
        score: rec.score,
        matched_gaps: rec.matchedGaps,
        explanation: rec.explanation,
      }));
      const { error: fallbackError } = await supabase.from('recommendations').insert(fallbackRows);
      if (fallbackError) {
        throw new Error(`Failed to insert recommendations (fallback): ${fallbackError.message}`);
      }
      return;
    }
    throw new Error(`Failed to insert recommendations: ${error.message}`);
  }
};

const deleteExistingRecommendations = async (userId: string, runId: string): Promise<void> => {
  const { error } = await supabase
    .from('recommendations')
    .delete()
    .eq('user_id', userId)
    .eq('run_id', runId);

  if (error) {
    if (isMissingRunIdColumn(error.message)) {
      logger.warn('recommendations.run_id column missing, deleting by user_id only', { error: error.message });
      const { error: fallbackError } = await supabase
        .from('recommendations')
        .delete()
        .eq('user_id', userId);
      if (fallbackError) {
        logger.warn('Failed to delete existing recommendations (fallback)', { error: fallbackError.message });
      }
      return;
    }
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

  try {
    logger.info('Starting course recommendation generation', { user_id, run_id, year, semester });

    // Step 1: Ensure market skills (if missing) and run gap analysis if needed
    try {
      await ensureMarketSkills(user_id, run_id);
    } catch (error) {
      logger.warn('Market skill extraction skipped', { error: error instanceof Error ? error.message : 'Unknown' });
    }

    let gapSkills = await fetchGapSkills(user_id, run_id);
    if (gapSkills.length === 0) {
      await runGapAnalysisInternal({ user_id, run_id, limit: 15 });
      gapSkills = await fetchGapSkills(user_id, run_id);
    }

    // Step 2: Fetch gap skills
    if (gapSkills.length === 0) {
      res.status(200).json({
        user_id,
        run_id,
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
        run_id,
        courses_found: 0,
        recommendations_created: 0,
        recommendations: [],
      });
      return;
    }

    // Step 4: Fetch courses from UIUC API (in parallel for each subject)
    logger.info('Fetching courses from UIUC API', { subjects: relevantSubjects });
    const coursePromises = relevantSubjects.map((subject) =>
      fetchCoursesForSubject(year, semester, subject)
    );
    const courseArrays = await Promise.all(coursePromises);
    const allCourses = courseArrays.flat();
    
    logger.info('Fetched courses from UIUC', { count: allCourses.length });

    if (allCourses.length === 0) {
      res.status(200).json({
        user_id,
        run_id,
        courses_found: 0,
        recommendations_created: 0,
        recommendations: [],
      });
      return;
    }

    // Step 5: Match courses to gap skills using Gemini
    logger.info('Matching courses to gap skills', { coursesCount: allCourses.length });
    const matchPromises = allCourses.map((course) => matchCourseToSkills(course, gapSkills));
    const matchResults = await Promise.all(matchPromises);

    // Combine courses with their match results
    const courseMatches = allCourses
      .map((course, index) => ({
        course,
        match: matchResults[index],
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
    await deleteExistingRecommendations(user_id, run_id);

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

    await insertRecommendations(user_id, run_id, recommendationsToInsert);

    logger.info('Course recommendations generated successfully', {
      coursesFound: allCourses.length,
      recommendationsCreated: recommendationsToInsert.length,
    });

    // Step 8: Return response
    const response: CourseRecommendationResponse = {
      user_id,
      run_id,
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
    logger.error('Course recommendation generation failed', { error: message, user_id, run_id });
    res.status(500).json({ error: 'Course recommendation generation failed', message });
  }
};
