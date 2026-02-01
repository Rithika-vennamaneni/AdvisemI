import type { MarketSkillDistinct, ResumeSkill } from '../gap/types.js';

type PromptOptions = {
  strict: boolean;
  priorError?: string;
};

const buildRules = (options: PromptOptions): string => {
  const baseRules = [
    'Return STRICT JSON only. No markdown, no code fences, no explanations.',
    'canonical_market must contain EXACTLY one entry per DISTINCT market_skill_raw in the input list.',
    'Do NOT add skills not present in market_skill_raw input.',
    'Use semantic/synonym matching against resume skill names AND evidence to determine coverage.',
    'If broader skill partially covers narrower skill (e.g., SQL vs PostgreSQL), use coverage_strength "moderate" or "weak" and explain briefly in gap_reason.',
    'gap_reason must be meaningful only for weak/none; keep it short and evidence-based.',
    'If market scores are missing, estimate market_importance from frequency (higher frequency = higher importance).'
  ];

  if (!options.strict) {
    return baseRules.join('\n');
  }

  const strictRules = [
    'JSON must parse with no trailing text.',
    'All strings must be double-quoted.',
    'Use null (not "null") for missing values.'
  ];

  const errorNote = options.priorError
    ? `Previous output error: ${options.priorError}`
    : undefined;

  return [...baseRules, ...strictRules, errorNote].filter(Boolean).join('\n');
};

export const buildGapPrompt = (
  resumeSkills: ResumeSkill[],
  marketSkills: MarketSkillDistinct[],
  options: PromptOptions
): string => {
  const inputPayload = {
    resume_skills: resumeSkills.map((skill) => ({
      skill_name_raw: skill.skill_name_raw,
      skill_name_trimmed: skill.skill_name_trimmed,
      score: skill.score,
      evidence: skill.evidence,
      expertise_level: skill.expertise_level
    })),
    market_skills: marketSkills.map((skill) => ({
      market_skill_raw: skill.market_skill_raw,
      frequency: skill.frequency,
      scores: skill.scores,
      evidence_samples: skill.evidence_samples
    }))
  };

  const schema = {
    canonical_market: [
      {
        market_skill_raw: 'string',
        market_skill_canonical: 'string',
        market_group: 'string|null',
        market_importance: 'number (0..1)',
        covered_by_resume: 'boolean',
        matched_resume_skill_raw: 'string|null',
        coverage_strength: 'strong|moderate|weak|none',
        gap_reason: 'string'
      }
    ]
  };

  return [
    'You are a backend service performing skill gap analysis.',
    buildRules(options),
    'Input JSON:',
    JSON.stringify(inputPayload),
    'Output JSON schema:',
    JSON.stringify(schema)
  ].join('\n');
};
