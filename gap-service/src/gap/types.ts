export type ResumeSkillRow = {
  skill_name: string | null;
  score: number | null;
  evidence: string | null;
  expertise_level: string | null;
};

export type MarketSkillRow = {
  skill_name: string | null;
  score: number | null;
  evidence: string | null;
};

export type ResumeSkill = {
  skill_name_raw: string;
  skill_name_trimmed: string;
  score: number | null;
  evidence: string | null;
  expertise_level: string | null;
};

export type MarketSkillDistinct = {
  market_skill_raw: string;
  frequency: number;
  scores: number[];
  evidence_samples: string[];
};

export type GeminiCanonicalMarketItem = {
  market_skill_raw: string;
  market_skill_canonical: string;
  market_group: string | null;
  market_importance: number;
  covered_by_resume: boolean;
  matched_resume_skill_raw: string | null;
  coverage_strength: 'strong' | 'moderate' | 'weak' | 'none';
  gap_reason: string;
};

export type GeminiCanonicalMarket = {
  canonical_market: GeminiCanonicalMarketItem[];
};

export type GapResult = {
  skill_name: string;
  priority: number;
  reason: string;
  market_importance: number;
};

export type PreprocessedSkills = {
  resumeSkills: ResumeSkill[];
  marketSkillsDistinct: MarketSkillDistinct[];
  marketSkillInputSet: Set<string>;
};
