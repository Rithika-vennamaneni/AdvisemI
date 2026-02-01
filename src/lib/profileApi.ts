export class ProfileApiError extends Error {
  public status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ProfileApiError';
    this.status = status;
  }
}

const DEFAULT_BACKEND_BASE_URL = 'http://localhost:8787';

const getBackendBaseUrl = (): string => {
  const envBaseUrl = import.meta.env.VITE_RESUME_PARSER_URL as string | undefined;
  return envBaseUrl ?? DEFAULT_BACKEND_BASE_URL;
};

type SaveProfileInput = {
  dream_role: string;
  term?: string;
};

export const saveProfile = async (input: SaveProfileInput, userId?: string): Promise<void> => {
  const baseUrl = getBackendBaseUrl();
  const res = await fetch(`${baseUrl}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dream_role: input.dream_role,
      term: input.term,
      user_id: userId
    })
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { error?: string };
      detail = body?.error ? ` - ${body.error}` : '';
    } catch {
      // ignore JSON parse errors
    }
    throw new ProfileApiError(`Profile request failed (${res.status})${detail}`, res.status);
  }
};
