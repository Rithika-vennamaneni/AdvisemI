const SUPABASE_URL = "https://ifnxriqbrvheqbtbdimc.supabase.co";

const STORAGE_KEY = 'advisemi_guest_user_id';

export const getOrCreateGuestUserId = async (): Promise<string> => {
  const existing = window.localStorage.getItem(STORAGE_KEY);
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
