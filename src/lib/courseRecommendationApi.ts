import { getRecommendationServiceUrl } from './backendBaseUrl';

export class CourseRecommendationApiError extends Error {
  public status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'CourseRecommendationApiError';
    this.status = status;
  }
}

export interface GenerateRecommendationsRequest {
  user_id: string;
  run_id: string;
  year: string;
  semester: 'spring' | 'summer' | 'fall';
  limit?: number;
}

export interface GenerateRecommendationsResponse {
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

export async function generateCourseRecommendations(
  request: GenerateRecommendationsRequest,
  opts?: { baseUrl?: string; signal?: AbortSignal }
): Promise<GenerateRecommendationsResponse> {
  const baseUrl = opts?.baseUrl ?? getRecommendationServiceUrl();

  const res = await fetch(`${baseUrl}/course-recommendations/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal: opts?.signal,
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { error?: string; message?: string; details?: unknown };
      detail = body?.error || body?.message ? ` - ${body.error || body.message}` : '';
      if (body.details) {
        detail += ` (${JSON.stringify(body.details)})`;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new CourseRecommendationApiError(
      `Course recommendation request failed (${res.status})${detail}`,
      res.status
    );
  }

  const data = (await res.json()) as GenerateRecommendationsResponse;
  return data;
}
