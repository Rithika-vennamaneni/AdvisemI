// Backend integration: Types for the resume parser API response

export type CanonicalSkillCategory =
  | 'programming_languages'
  | 'frameworks'
  | 'tools'
  | 'databases'
  | 'data_skills'
  | 'ml_ai'
  | 'cloud'
  | 'operating_systems'
  | 'soft_skills'
  | 'domain_skills'
  | 'other';

export interface ResumeEducationItem {
  degree?: string | null;
  major?: string | null;
  school?: string | null;
  grad_year?: string | null;
  level?: string | null;
}

export interface ResumeWorkExperienceItem {
  company?: string | null;
  role?: string | null;
  duration_months?: number | null;
  key_skills: string[];
  impact_summary: string;
}

export interface ResumeProjectItem {
  name?: string | null;
  skills_used: string[];
  problem_domain?: string | null;
}

export type CanonicalSkills = Record<CanonicalSkillCategory, string[]>;

export interface ResumeParseResult {
  education: ResumeEducationItem[];
  work_experience: ResumeWorkExperienceItem[];
  projects: ResumeProjectItem[];
  canonical_skills: CanonicalSkills;
}
