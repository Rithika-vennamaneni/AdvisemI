import { z } from 'zod';

const optionalString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(1).optional()
);

const optionalUuid = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().uuid().optional()
);

const optionalEmail = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().email().optional()
);

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: optionalString,
  OPENAI_BASE_URL: optionalString,
  OPENAI_MAX_OUTPUT_TOKENS: optionalString,
  OPENAI_TEMPERATURE: optionalString,
  MARKET_SKILL_MAX_JOBS: optionalString,
  MARKET_SKILL_MAX_SKILLS: optionalString,
  ADZUNA_APP_ID: optionalString,
  ADZUNA_APP_KEY: optionalString,
  PORT: optionalString,
  DEFAULT_USER_ID: optionalUuid,
  DEFAULT_USER_EMAIL: optionalEmail,
  DEFAULT_USER_PASSWORD: optionalString
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${issues}`);
}

export const env = parsed.data;

export const port = (() => {
  const raw = env.PORT ?? '4000';
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`Invalid PORT value: ${raw}`);
  }
  return numeric;
})();
