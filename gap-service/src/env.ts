import { z } from 'zod';

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  MODEL: z.string().min(1),
  PORT: z.string().optional()
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
