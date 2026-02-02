const SUPABASE_URL = "https://ifnxriqbrvheqbtbdimc.supabase.co";

const STORAGE_KEY = 'advisemi_guest_user_id';

// UUID v4 format validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidUuid = (value: string): boolean => UUID_REGEX.test(value);

export const getStoredGuestUserId = (): string | null => {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  // Only return if it's a valid UUID (not a legacy placeholder like "user-demo-123")
  if (stored && isValidUuid(stored)) {
    return stored;
  }
  // Clear invalid values
  if (stored) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return null;
};

export const getOrCreateGuestUserId = async (): Promise<string> => {
  const existing = getStoredGuestUserId();
  if (existing) {
    return existing;
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/session-guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });

  if (!res.ok) {
    throw new Error(`Failed to create guest session (${res.status})`);
  }

  const data = (await res.json()) as { user_id?: string };
  if (!data.user_id) {
    throw new Error('Guest session did not return user_id');
  }

  window.localStorage.setItem(STORAGE_KEY, data.user_id);
  return data.user_id;
};
