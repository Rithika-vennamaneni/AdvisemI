// Backend integration: Router state types for passing parsed resume between pages

import type { ResumeParseResponse } from '@/types/resumeParser';

export interface SkillsReviewLocationState {
  parsedResume?: ResumeParseResponse;
  run_id?: string | null;
  user_id?: string | null;
}
