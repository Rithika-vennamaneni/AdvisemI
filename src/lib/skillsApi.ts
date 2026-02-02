import { getBackendBaseUrl } from './backendBaseUrl';

export type SkillLevelUpdate = {
  skill_name: string;
  expertise_level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
};

export type SkillUpdateResponse = {
  updated_count: number;
  updated: SkillLevelUpdate[];
  not_found: string[];
};

export const updateSkillLevels = async (
  userId: string,
  runId: string,
  updates: SkillLevelUpdate[]
): Promise<SkillUpdateResponse> => {
  const baseUrl = getBackendBaseUrl();
  const res = await fetch(`${baseUrl}/skills/update-levels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      run_id: runId,
      updates
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Skill update failed (${res.status}): ${text}`);
  }

  return (await res.json()) as SkillUpdateResponse;
};
