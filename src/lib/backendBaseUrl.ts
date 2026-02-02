/**
 * Shared helper for determining the backend base URL.
 * Priority:
 * 1. VITE_RESUME_PARSER_URL (legacy, most specific)
 * 2. VITE_API_BASE_URL (general API base)
 * 3. window.location.origin in production
 * 4. http://localhost:8787 in development only
 */

const isDev = (): boolean => {
  return import.meta.env.DEV === true;
};

export const getBackendBaseUrl = (): string => {
  const resumeParserUrl = import.meta.env.VITE_RESUME_PARSER_URL as string | undefined;
  if (resumeParserUrl) return resumeParserUrl;

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (apiBaseUrl) return apiBaseUrl;

  // In production, use the same origin (assumes backend is served from same domain or proxied)
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
