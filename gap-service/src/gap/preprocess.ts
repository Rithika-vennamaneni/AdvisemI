import { normalizeSkillName, trimSkillName } from '../util/strings.js';
import type { MarketSkillDistinct, MarketSkillRow, PreprocessedSkills, ResumeSkill, ResumeSkillRow } from './types.js';

const addEvidence = (list: string[], evidence: string | null): void => {
  if (!evidence) return;
  if (list.length >= 3) return;
  list.push(evidence);
};

const addScore = (list: number[], score: number | null): void => {
  if (score === null || !Number.isFinite(score)) return;
  list.push(score);
};

export const preprocessSkills = (
  resumeRows: ResumeSkillRow[],
  marketRows: MarketSkillRow[]
): PreprocessedSkills => {
  const resumeSkills: ResumeSkill[] = resumeRows.map((row) => {
    const raw = row.skill_name ?? '';
    return {
      skill_name_raw: raw,
      skill_name_trimmed: trimSkillName(raw),
      score: row.score,
      evidence: row.evidence,
      expertise_level: row.expertise_level
    };
  });

  const marketMap = new Map<string, MarketSkillDistinct>();

  for (const row of marketRows) {
    const raw = row.skill_name ?? '';
    const trimmed = trimSkillName(raw);
    if (!trimmed) {
      continue;
    }
    const key = normalizeSkillName(trimmed);
    if (!key) {
      continue;
    }
    const existing = marketMap.get(key) ?? {
      market_skill_raw: trimmed,
      frequency: 0,
      scores: [],
      evidence_samples: []
    };
    existing.frequency += 1;
    addScore(existing.scores, row.score);
    addEvidence(existing.evidence_samples, row.evidence);
    marketMap.set(key, existing);
  }

  const marketSkillsDistinct = Array.from(marketMap.values());
  const marketSkillInputSet = new Set(marketSkillsDistinct.map((item) => item.market_skill_raw));

  return { resumeSkills, marketSkillsDistinct, marketSkillInputSet };
};
