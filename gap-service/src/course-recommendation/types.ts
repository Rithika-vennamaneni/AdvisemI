export interface GapSkill {
  id: string;
  user_id: string;
  skill_name: string;
  priority: number;
  reason: string | null;
  run_id?: string | null;
}

export interface CourseRecommendationRequest {
  user_id: string;
  run_id: string;
  year: string;
  semester: string;
  limit?: number;
}

export interface CourseRecommendationResponse {
  user_id: string;
  run_id: string;
  courses_found: number;
  recommendations_created: number;
  recommendations: Array<{
    course_id: string;
    course: {
      subject: string;
      number: string;
      title: string;
    };
    score: number;
    matched_gaps: string[];
    explanation: string;
  }>;
}
