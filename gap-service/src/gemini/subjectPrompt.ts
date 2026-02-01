import type { GapSkill } from '../course-recommendation/types.js';

export const buildSubjectSelectionPrompt = (gapSkills: GapSkill[]): string => {
  const skillsPayload = gapSkills.map((skill) => ({
    skill_name: skill.skill_name,
    priority: skill.priority,
    reason: skill.reason,
  }));

  const schema = {
    relevant_subjects: [
      {
        subject_code: 'string (2-4 uppercase letters, e.g., "CS", "ECE", "MATH")',
        relevance_score: 'number (0..1)',
        reasoning: 'string (brief explanation)'
      }
    ]
  };

  return [
    'You are a course recommendation system for the University of Illinois at Urbana-Champaign.',
    'Given a list of skill gaps, identify which UIUC subject codes (departments) are most relevant for developing those skills.',
    '',
    'Rules:',
    '- Return STRICT JSON only. No markdown, no code fences, no explanations outside JSON.',
    '- subject_code must be valid UIUC subject codes (e.g., CS, ECE, MATH, STAT, IS, BADM, etc.)',
    '- Only include subjects that are clearly relevant to the skill gaps',
    '- relevance_score should reflect how well the subject addresses the gaps (higher priority gaps should influence scores)',
    '- Limit to top 5-10 most relevant subjects',
    '- reasoning should be concise (1-2 sentences)',
    '',
    'Input JSON:',
    JSON.stringify({ gap_skills: skillsPayload }, null, 2),
    '',
    'Output JSON schema:',
    JSON.stringify(schema, null, 2),
  ].join('\n');
};

export interface SubjectSelectionResult {
  relevant_subjects: Array<{
    subject_code: string;
    relevance_score: number;
    reasoning: string;
  }>;
}
