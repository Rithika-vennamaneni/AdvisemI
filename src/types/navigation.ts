// Backend integration: Router state types for passing parsed resume between pages

import type { ResumeParseResult } from '@/types/resumeParser';

export interface SkillsReviewLocationState {
  parsedResume?: ResumeParseResult;
}
