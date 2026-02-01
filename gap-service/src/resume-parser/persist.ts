import { supabase } from '../util/supabase.js';
import { logger } from '../util/logger.js';
import { trimSkillName } from '../util/strings.js';

export type ResumeSkillInput = {
  skill_name: string;
  score?: number | null;
  evidence?: string | null;
  expertise_level?: string | null;
};

type CreateRunInput = {
  user_id: string;
  dream_role?: string | null;
  term?: string | null;
  run_id?: string | null;
};

type SaveDocumentInput = {
  user_id: string;
  run_id: string;
  raw_text: string;
};

type SaveSkillsInput = {
  user_id: string;
  run_id: string;
  dream_role?: string | null;
  skills: ResumeSkillInput[];
};

export const createOrGetRun = async (input: CreateRunInput): Promise<string> => {
  const { user_id, dream_role, term, run_id } = input;

  if (run_id) {
    const { data: existing, error: selectError } = await supabase
      .from('runs')
      .select('id')
      .eq('id', run_id)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      throw new Error(`Failed to lookup run: ${selectError.message}`);
    }

    if (existing?.id) {
      return existing.id;
    }

    const { error: insertError } = await supabase
      .from('runs')
      .insert({
        id: run_id,
        user_id,
        dream_role: dream_role ?? null,
        term: term ?? null
      });

    if (insertError) {
      throw new Error(`Failed to create run: ${insertError.message}`);
    }

    return run_id;
  }

  const { data, error } = await supabase
    .from('runs')
    .insert({
      user_id,
      dream_role: dream_role ?? null,
      term: term ?? null
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    throw new Error(`Failed to create run: ${error?.message ?? 'Unknown error'}`);
  }

  return data.id;
};

export const saveResumeDocument = async (input: SaveDocumentInput): Promise<void> => {
  const { user_id, run_id, raw_text } = input;

  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('user_id', user_id)
    .eq('run_id', run_id)
    .eq('type', 'resume');

  if (deleteError) {
    throw new Error(`Failed to clear resume document: ${deleteError.message}`);
  }

  const { error: insertError } = await supabase
    .from('documents')
    .insert({
      user_id,
      run_id,
      type: 'resume',
      raw_text
    });

  if (insertError) {
    throw new Error(`Failed to insert resume document: ${insertError.message}`);
  }
};

const dedupeSkills = (skills: ResumeSkillInput[]): ResumeSkillInput[] => {
  const seen = new Map<string, ResumeSkillInput>();
  skills.forEach((skill) => {
    const trimmed = trimSkillName(skill.skill_name);
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, {
        skill_name: trimmed,
        score: skill.score ?? null,
        evidence: skill.evidence ?? null,
        expertise_level: skill.expertise_level ?? null
      });
    }
  });
  return Array.from(seen.values());
};

export const saveResumeSkills = async (input: SaveSkillsInput): Promise<number> => {
  const { user_id, run_id, dream_role, skills } = input;
  const uniqueSkills = dedupeSkills(skills);

  const { error: deleteError } = await supabase
    .from('skills')
    .delete()
    .eq('user_id', user_id)
    .eq('source', 'resume');

  if (deleteError) {
    throw new Error(`Failed to clear resume skills: ${deleteError.message}`);
  }

  if (uniqueSkills.length === 0) {
    return 0;
  }

  const rows = uniqueSkills.map((skill) => ({
    user_id,
    run_id,
    source: 'resume',
    skill_name: skill.skill_name,
    score: skill.score ?? null,
    evidence: skill.evidence ?? null,
    expertise_level: skill.expertise_level ?? null,
    dream_role: dream_role ?? null
  }));

  const { error: insertError } = await supabase
    .from('skills')
    .insert(rows);

  if (insertError) {
    throw new Error(`Failed to insert resume skills: ${insertError.message}`);
  }

  logger.info('Resume skills saved', { count: rows.length });
  return rows.length;
};
