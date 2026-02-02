import { supabase } from '@/integrations/supabase/client';
import type { GapSkill, Course, Recommendation } from '@/types/database';

export async function fetchGapSkills(
  userId: string,
  _runId: string | null = null
): Promise<GapSkill[]> {
  // Note: run_id column doesn't exist on gap_skills table yet
  const query = supabase
    .from('gap_skills')
    .select('*')
    .eq('user_id', userId)
    .order('priority', { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch gap skills: ${error.message}`);
  }

  return (data || []) as GapSkill[];
}

export interface RecommendationWithCourse extends Recommendation {
  course: Course;
}

export async function fetchRecommendationsWithCourses(
  userId: string,
  _runId: string | null = null
): Promise<RecommendationWithCourse[]> {
  // Note: run_id column doesn't exist on recommendations table yet
  const query = supabase
    .from('recommendations')
    .select(`
      *,
      course:courses(*)
    `)
    .eq('user_id', userId)
    .order('score', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch recommendations: ${error.message}`);
  }

  // Transform the response to match our type
  const recommendations: RecommendationWithCourse[] = [];

  for (const rec of data || []) {
    const course = rec.course;
    if (course && !Array.isArray(course)) {
      recommendations.push({
        ...rec,
        course: course as Course,
        matched_gaps: Array.isArray(rec.matched_gaps)
          ? rec.matched_gaps
          : typeof rec.matched_gaps === 'string'
          ? JSON.parse(rec.matched_gaps)
          : [],
      } as RecommendationWithCourse);
    }
  }

  return recommendations;
}

export interface Profile {
  id: string;
  user_id: string;
  dream_role: string | null;
  term: string | null;
  created_at: string;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  return data as Profile | null;
}

export function parseTerm(term: string | null): { year: string; semester: 'spring' | 'summer' | 'fall' } | null {
  if (!term) return null;

  // Expected format: "2026-spring" or "2026-spring"
  const match = term.match(/^(\d{4})-(spring|summer|fall)$/);
  if (!match) {
    return null;
  }

  return {
    year: match[1],
    semester: match[2] as 'spring' | 'summer' | 'fall',
  };
}
