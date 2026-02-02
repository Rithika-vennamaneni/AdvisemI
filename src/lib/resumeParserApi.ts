// Backend integration: API client for resume parser Edge Function

import type { ResumeParseResponse } from '@/types/resumeParser';

const SUPABASE_URL = "https://ifnxriqbrvheqbtbdimc.supabase.co";

export class ResumeParserApiError extends Error {
  public status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ResumeParserApiError';
    this.status = status;
  }
}

export async function parseResumePdf(
  file: File,
  opts?: { signal?: AbortSignal; userId?: string; runId?: string; dreamRole?: string; term?: string }
): Promise<ResumeParseResponse> {
  // Prepare multipart upload
  const form = new FormData();
  form.append('file', file);
  if (opts?.userId) form.append('user_id', opts.userId);
  if (opts?.runId) form.append('run_id', opts.runId);
  if (opts?.dreamRole) form.append('dream_role', opts.dreamRole);
  if (opts?.term) form.append('term', opts.term);

  // Call Supabase Edge Function
  const res = await fetch(`${SUPABASE_URL}/functions/v1/parse-resume`, {
    method: 'POST',
    body: form,
    signal: opts?.signal,
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { detail?: string };
      detail = body?.detail ? ` - ${body.detail}` : '';
    } catch {
      // ignore JSON parse errors
    }
    throw new ResumeParserApiError(`Resume parser request failed (${res.status})${detail}`, res.status);
  }

  // Parse structured JSON response
  const data = (await res.json()) as ResumeParseResponse;
  console.log('Resume parser response:', data);
  return data;
}
