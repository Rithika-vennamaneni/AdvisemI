const SUPABASE_URL = "https://ifnxriqbrvheqbtbdimc.supabase.co";

export class ProfileApiError extends Error {
  public status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ProfileApiError';
    this.status = status;
  }
}

type SaveProfileInput = {
  dream_role: string;
  term?: string;
};

export const saveProfile = async (input: SaveProfileInput, userId?: string): Promise<void> => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/profile`, {
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
