// Backend integration: API client for FastAPI resume parser

import type { ResumeParseResponse } from '@/types/resumeParser';

const DEFAULT_RESUME_PARSER_BASE_URL = 'http://localhost:8787';

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
  opts?: { baseUrl?: string; signal?: AbortSignal; userId?: string; runId?: string; dreamRole?: string; term?: string }
): Promise<ResumeParseResponse> {
  // Backend integration: prepare multipart upload
  const form = new FormData();
  form.append('file', file);
  if (opts?.userId) form.append('user_id', opts.userId);
  if (opts?.runId) form.append('run_id', opts.runId);
  if (opts?.dreamRole) form.append('dream_role', opts.dreamRole);
  if (opts?.term) form.append('term', opts.term);

  // Backend integration: allow runtime override via Vite env var.
  const envBaseUrl = (import.meta as any)?.env?.VITE_RESUME_PARSER_URL as string | undefined;
  const baseUrl = opts?.baseUrl ?? envBaseUrl ?? DEFAULT_RESUME_PARSER_BASE_URL;

  // Backend integration: call FastAPI POST /parse
  const res = await fetch(`${baseUrl}/parse`, {
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

  // Backend integration: parse structured JSON response
  const data = (await res.json()) as ResumeParseResponse;
  // Backend integration: console log for debugging
  console.log('Resume parser response:', data);
  return data;
}
