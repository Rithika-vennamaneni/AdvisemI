import type { GapSkill } from '../course-recommendation/types.js';
import type { UIUCCourse } from '../uiuc/types.js';

export const buildCourseMatchPrompt = (
  gapSkills: GapSkill[],
  course: UIUCCourse
): string => {
  const skillsPayload = gapSkills.map((skill) => ({
    skill_name: skill.skill_name,
    priority: skill.priority,
    reason: skill.reason,
  }));

  const coursePayload = {
    subject: course.subject,
    number: course.number,
    title: course.title,
    description: course.description || 'No description available',
    credits: course.credits,
  };

  const schema = {
    match_score: 'number (0..1)',
    matched_gaps: 'array of strings (skill names from input that this course addresses)',
    explanation: 'string (2-3 sentences explaining why this course is recommended)',
    confidence: 'number (0..1, how confident the match is)'
  };

  return [
    'You are a course recommendation system matching UIUC courses to skill gaps.',
    'Analyze whether the given course helps develop the listed skill gaps.',
    '',
    'Rules:',
    '- Return STRICT JSON only. No markdown, no code fences, no explanations outside JSON.',
    '- match_score: 0.0 = no match, 1.0 = perfect match for multiple high-priority gaps',
    '- matched_gaps: array of skill_name values from the input that this course addresses',
    '- explanation: human-readable explanation for why this course is recommended (2-3 sentences)',
    '- confidence: how confident you are in this match (consider if description is missing or vague)',
    '- Higher priority gaps should influence the match_score more',
    '- A course that addresses multiple gaps should have a higher score',
    '- Be conservative: only include gaps that are clearly addressed by the course',
    '',
    'Input JSON:',
    JSON.stringify({
      gap_skills: skillsPayload,
      course: coursePayload,
    }, null, 2),
    '',
    'Output JSON schema:',
    JSON.stringify(schema, null, 2),
  ].join('\n');
};

export interface CourseMatchResult {
  match_score: number;
  matched_gaps: string[];
  explanation: string;
  confidence: number;
}
