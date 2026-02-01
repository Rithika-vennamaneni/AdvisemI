export type JsonParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const extractJsonObject = (text: string): string | null => {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }
  return text.slice(firstBrace, lastBrace + 1);
};

export const safeJsonParse = <T>(text: string): JsonParseResult<T> => {
  const trimmed = text.trim();
  const candidate = trimmed.startsWith('{') && trimmed.endsWith('}')
    ? trimmed
    : extractJsonObject(trimmed) ?? trimmed;
  try {
    const parsed = JSON.parse(candidate) as T;
    return { ok: true, value: parsed };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown JSON parse error';
    return { ok: false, error: message };
  }
};
