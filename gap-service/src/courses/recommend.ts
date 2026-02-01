import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../util/supabase.js';
import { logger } from '../util/logger.js';
import { fetchCourseDetail, searchCourses, type CourseDetail, type CourseRef } from './cisApi.js';
import { groupLearningSkills } from '../util/learningSkills.js';

const requestSchema = z.object({
  user_id: z.string().uuid(),
  run_id: z.string().uuid(),
  limit: z.number().int().min(1).max(50).optional()
});

const stopwords = new Set([
  'remote', 'hybrid', 'onsite', 'salary', 'benefits', 'health', 'insurance',
  'full-time', 'part-time', 'contract', 'internship', 'intern', 'location',
  'team', 'role', 'roles', 'position', 'positions', 'experience', 'years',
  'year', 'day', 'days', 'week', 'weeks', 'month', 'months', 'company',
  'companies', 'staff', 'lead', 'senior', 'junior', 'entry', 'level'
]);

const synonymMap: Record<string, string[]> = {
  postgresql: ['postgresql', 'postgres'],
  kubernetes: ['kubernetes', 'k8s'],
  'machine learning': ['machine learning', 'ml'],
  javascript: ['javascript', 'js']
};

const normalizeTerm = (input: string): { year: number; term: 'fall' | 'spring' | 'summer' } => {
  const lower = input.toLowerCase();
  const yearMatch = lower.match(/(20\d{2})/);
  if (!yearMatch) {
    throw new Error(`Unable to parse year from term: ${input}`);
  }
  const year = Number(yearMatch[1]);
  const termWord = lower.includes('fall') || lower.includes('fa')
    ? 'fall'
    : lower.includes('spring') || lower.includes('sp')
    ? 'spring'
    : lower.includes('summer') || lower.includes('su')
    ? 'summer'
    : null;
  if (!termWord) {
    throw new Error(`Unable to parse term from term: ${input}`);
  }
  return { year, term: termWord };
};

const tokenizeSkill = (skill: string): string[] => {
  return skill
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && !stopwords.has(token));
};

const buildQueryParam = (skill: string): { key: 'qs' | 'qw_o' | 'qw_a'; value: string } | null => {
  const normalized = skill.trim().toLowerCase();
  if (!normalized) return null;

  const synonyms = synonymMap[normalized];
  if (synonyms && synonyms.length > 0) {
    const words = synonyms
      .flatMap((item) => item.split(/\s+/))
      .filter((token) => token.length > 0);
    if (words.length === 1) {
      return { key: 'qs', value: words[0] };
    }
    return { key: 'qw_o', value: words.join(' ') };
  }

  const tokens = tokenizeSkill(normalized);
  if (tokens.length === 0) return null;
  if (tokens.length === 1) {
    return { key: 'qs', value: tokens[0] };
  }
  return { key: 'qw_o', value: tokens.join(' ') };
};

const uniqueCourseKey = (course: CourseRef): string => `${course.subject}-${course.number}`;

const buildMatchedGaps = (
  gaps: Array<{ skill_name: string; priority: number }>,
  course: CourseDetail
): { matched: string[]; score: number } => {
  const haystack = `${course.title ?? ''} ${course.description ?? ''}`.toLowerCase();
  const titleStack = (course.title ?? '').toLowerCase();
  const matched: string[] = [];
  let score = 0;

  gaps.forEach((gap) => {
    const tokens = tokenizeSkill(gap.skill_name);
    if (tokens.length === 0) return;
    const allInText = tokens.every((token) => haystack.includes(token));
    if (!allInText) return;
    matched.push(gap.skill_name);
    const base = Math.max(1, 6 - gap.priority);
    const titleMatch = tokens.every((token) => titleStack.includes(token));
    score += base + (titleMatch ? 2 : 0);
  });

  return { matched, score };
};

const buildExplanation = (matched: string[]): string => {
  const list = matched.slice(0, 4).join(', ');
  return `Addresses gaps in ${list} through coursework aligned to these skills.`;
};

export const recommendCoursesHandler = async (req: Request, res: Response): Promise<void> => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }

  const { user_id, run_id, limit = 10 } = parsed.data;

  try {
    const { data: run, error: runError } = await supabase
      .from('runs')
      .select('id, term')
      .eq('id', run_id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (runError || !run) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }

    if (!run.term) {
      res.status(400).json({ error: 'Run term is missing' });
      return;
    }

    const { year, term } = normalizeTerm(run.term);

    const { data: gapSkills, error: gapError } = await supabase
      .from('gap_skills')
      .select('skill_name, priority')
      .eq('user_id', user_id)
      .eq('run_id', run_id)
      .order('priority', { ascending: true })
      .limit(15);

    if (gapError) {
      throw new Error(`Failed to fetch gap skills: ${gapError.message}`);
    }

    const gaps = (gapSkills ?? [])
      .filter((gap) => Boolean(gap.skill_name))
      .map((gap) => ({
        skill_name: gap.skill_name as string,
        priority: gap.priority
      }));
    logger.info('Gap skills fetched for recommendations', { count: gaps.length });

    if (gaps.length === 0) {
      res.status(200).json({ user_id, run_id, inserted_count: 0, recommendations: [] });
      return;
    }

    const courseHits = new Map<string, CourseRef>();
    const learningSkills = groupLearningSkills(gaps.map((gap) => gap.skill_name));

    for (const learningSkill of learningSkills) {
      const primaryQuery = buildQueryParam(learningSkill.name);
      if (!primaryQuery) continue;
      const primaryHits = await searchCourses(year, term, primaryQuery);
      logger.info('Course hits for learning skill', { skill: learningSkill.name, count: primaryHits.length });
      primaryHits.forEach((course) => {
        courseHits.set(uniqueCourseKey(course), course);
      });

      if (primaryHits.length < 2 && learningSkill.covers.length > 0) {
        for (const cover of learningSkill.covers) {
          if (cover.toLowerCase() === learningSkill.name.toLowerCase()) continue;
          const coverQuery = buildQueryParam(cover);
          if (!coverQuery) continue;
          const coverHits = await searchCourses(year, term, coverQuery);
          logger.info('Course hits for cover term', { skill: learningSkill.name, cover, count: coverHits.length });
          coverHits.forEach((course) => {
            courseHits.set(uniqueCourseKey(course), course);
          });
        }
      }
    }

    const uniqueCourses = Array.from(courseHits.values());
    logger.info('Unique courses collected', { count: uniqueCourses.length });

    const detailCache = new Map<string, CourseDetail>();
    const courseDetails: CourseDetail[] = [];

    for (const course of uniqueCourses) {
      const key = uniqueCourseKey(course);
      if (detailCache.has(key)) {
        courseDetails.push(detailCache.get(key)!);
        continue;
      }
      const detail = await fetchCourseDetail(year, term, course.subject, course.number);
      detailCache.set(key, detail);
      courseDetails.push(detail);
    }

    const courseRows = courseDetails.map((detail) => ({
      term: `${term} ${year}`,
      subject: detail.subject,
      number: detail.number,
      title: detail.title,
      description: detail.description,
      course_url: detail.course_url,
      last_synced: new Date().toISOString()
    }));

    const { data: upsertedCourses, error: courseError } = await supabase
      .from('courses')
      .upsert(courseRows, { onConflict: 'term,subject,number' })
      .select('id, term, subject, number, title, description, course_url');

    if (courseError) {
      throw new Error(`Failed to upsert courses: ${courseError.message}`);
    }

    logger.info('Courses upserted', { count: upsertedCourses?.length ?? 0 });

    const courseByKey = new Map<string, typeof upsertedCourses[number]>();
    (upsertedCourses ?? []).forEach((course) => {
      courseByKey.set(`${course.subject}-${course.number}`, course);
    });

    const ranked = (upsertedCourses ?? [])
      .map((course) => {
        const detail = courseDetails.find((item) => item.subject === course.subject && item.number === course.number);
        const fallbackDetail = detail ?? {
          subject: course.subject,
          number: course.number,
          title: course.title,
          description: course.description,
          course_url: course.course_url ?? ''
        };
        const match = buildMatchedGaps(gaps, fallbackDetail);
        return {
          course,
          matched_gaps: match.matched,
          score: match.score,
          explanation: buildExplanation(match.matched)
        };
      })
      .filter((item) => item.matched_gaps.length > 0)
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return a.course.subject.localeCompare(b.course.subject) || a.course.number.localeCompare(b.course.number);
      })
      .slice(0, limit);

    await supabase
      .from('recommendations')
      .delete()
      .eq('user_id', user_id)
      .eq('run_id', run_id);

    if (ranked.length > 0) {
      const rows = ranked.map((item) => ({
        user_id,
        run_id,
        course_id: item.course.id,
        score: item.score,
        matched_gaps: item.matched_gaps,
        explanation: item.explanation
      }));

      const { error: insertError } = await supabase
        .from('recommendations')
        .insert(rows);

      if (insertError) {
        throw new Error(`Failed to insert recommendations: ${insertError.message}`);
      }
    }

    logger.info('Recommendations inserted', { count: ranked.length });

    res.status(200).json({
      user_id,
      run_id,
      inserted_count: ranked.length,
      recommendations: ranked.map((item) => ({
        course: {
          subject: item.course.subject,
          number: item.course.number,
          title: item.course.title,
          course_url: item.course.course_url
        },
        score: item.score,
        matched_gaps: item.matched_gaps,
        explanation: item.explanation
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Course recommendation failed', { error: message });
    res.status(500).json({ error: 'Course recommendation failed', message });
  }
};
