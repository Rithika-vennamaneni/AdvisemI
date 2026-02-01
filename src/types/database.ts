// Types matching Supabase schema for seamless future integration

export interface Profile {
  id: string;
  user_id: string;
  dream_role: string;
  term: string;
  created_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  type: 'resume' | 'job_query';
  raw_text: string;
  created_at: string;
}

export interface Skill {
  id: string;
  user_id: string;
  source: 'resume' | 'market';
  skill_name: string;
  score: number; // 0-1 float
  evidence: string;
  created_at: string;
}

export interface GapSkill {
  id: string;
  user_id: string;
  skill_name: string;
  priority: number;
  reason: string;
  created_at: string;
}

export interface Course {
  id: string;
  term: string;
  subject: string;
  number: string;
  title: string;
  description: string | null;
  course_url: string | null;
  credits?: number | null;
  last_synced: string | null;
}

export interface Recommendation {
  id: string;
  user_id: string;
  course_id: string;
  score: number;
  matched_gaps: string[];
  explanation: string;
  created_at: string;
}

// Helper type for strength mapping
export type SkillStrength = 'strong' | 'medium' | 'weak';

export const getSkillStrength = (score: number): SkillStrength => {
  if (score > 0.7) return 'strong';
  if (score >= 0.4) return 'medium';
  return 'weak';
};

// Category grouping for skills
export type SkillCategory = 'technical' | 'tools' | 'soft' | 'domain';

export interface SkillWithCategory extends Skill {
  category: SkillCategory;
}
