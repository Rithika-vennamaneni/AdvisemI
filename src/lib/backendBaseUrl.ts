/**
 * Shared helper for determining the backend base URL.
 * Priority:
 * 1. VITE_RESUME_PARSER_URL (legacy, most specific)
 * 2. VITE_API_BASE_URL (general API base)
 * 3. window.location.origin in production
 * 4. http://localhost:8787 in development only
 * 
 * Note: Since Supabase/Lovable doesn't support VITE_* variables in production,
 * this will fall back to origin. If you need a separate backend service,
 * consider using Supabase Edge Functions instead.
 */

const isDev = (): boolean => {
  // Pure runtime check - only localhost/127.0.0.1 is development
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
};

export const getBackendBaseUrl = (): string => {
  // Try environment variables first (works in dev with .env file)
  const resumeParserUrl = import.meta.env.VITE_RESUME_PARSER_URL as string | undefined;
  if (resumeParserUrl) return resumeParserUrl;

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (apiBaseUrl) return apiBaseUrl;

  // In production (non-localhost), use the same origin
  // This assumes the backend is served from the same domain or proxied
  if (!isDev()) {
    return window.location.origin;
  }

  // Only use localhost in development
  return 'http://localhost:8787';
};

/**
 * For the recommendation service, allows a separate URL override.
 * Priority:
 * 1. VITE_RECOMMENDATION_SERVICE_URL
 * 2. Falls back to getBackendBaseUrl()
 */
export const getRecommendationServiceUrl = (): string => {
  const recommendationUrl = import.meta.env.VITE_RECOMMENDATION_SERVICE_URL as string | undefined;
  if (recommendationUrl) return recommendationUrl;

  return getBackendBaseUrl();
};
