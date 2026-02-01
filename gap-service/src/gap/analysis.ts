import { normalizeSkillName, toPreferredTitleCase, truncateReason } from '../util/strings.js';
import { clamp, normalizeToUnit, quintileIndex } from '../util/quantiles.js';
import type {
  GapResult,
  GeminiCanonicalMarket,
  MarketSkillDistinct,
  ResumeSkill
} from './types.js';

const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
};

const computePriority = (coverageStrength: 'none' | 'weak', quintile: number): number => {
  const base = coverageStrength === 'none' ? 1 : 2;
  return Math.min(5, base + (4 - quintile));
};

export const computeGapsFromGemini = (
  canonical: GeminiCanonicalMarket
): GapResult[] => {
  const importances = canonical.canonical_market.map((item) => item.market_importance);

  return canonical.canonical_market
    .filter((item) => item.coverage_strength === 'none' || item.coverage_strength === 'weak')
    .map((item) => {
      const quintile = quintileIndex(importances, item.market_importance);
      const coverageStrength = item.coverage_strength === 'none' ? 'none' : 'weak';
      const reason = truncateReason(
        item.gap_reason || 'Missing or weakly covered in resume.'
      );
      const skillName = toPreferredTitleCase(
        item.market_skill_canonical || item.market_skill_raw
      );
      return {
        skill_name: skillName,
        priority: computePriority(coverageStrength, quintile),
        reason,
        market_importance: item.market_importance
      };
    });
};

export const computeGapsDeterministic = (
  resumeSkills: ResumeSkill[],
  marketSkills: MarketSkillDistinct[]
): GapResult[] => {
  const resumeSet = new Set(resumeSkills.map((skill) => normalizeSkillName(skill.skill_name_trimmed)));

  const importanceRawValues = marketSkills.map((skill) => {
    if (skill.scores.length > 0) {
      return average(skill.scores);
    }
    return skill.frequency;
  });

  const maxFrequency = Math.max(1, ...marketSkills.map((skill) => skill.frequency));

  return marketSkills
    .filter((skill) => !resumeSet.has(normalizeSkillName(skill.market_skill_raw)))
    .map((skill) => {
      const rawImportance = skill.scores.length > 0 ? average(skill.scores) : skill.frequency;
      const importance = skill.scores.length > 0
        ? clamp(rawImportance, 0, 1)
        : clamp(skill.frequency / maxFrequency, 0, 1);
      const quintile = quintileIndex(importanceRawValues, rawImportance);
      return {
        skill_name: toPreferredTitleCase(skill.market_skill_raw),
        priority: computePriority('none', quintile),
        reason: truncateReason('Missing from resume; appears in job listings.'),
        market_importance: normalizeToUnit(importanceRawValues, rawImportance)
      };
    });
};

export const orderAndLimitGaps = (gaps: GapResult[], limit: number): GapResult[] => {
  const ordered = [...gaps].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    if (a.market_importance !== b.market_importance) {
      return b.market_importance - a.market_importance;
    }
    return a.skill_name.localeCompare(b.skill_name);
  });
  return ordered.slice(0, limit);
};
