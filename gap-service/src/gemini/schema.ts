import { z } from 'zod';

export const coverageStrengthSchema = z.enum(['strong', 'moderate', 'weak', 'none']);

export const canonicalMarketItemSchema = z.object({
  market_skill_raw: z.string().min(1),
  market_skill_canonical: z.string().min(1),
  market_group: z.string().nullable(),
  market_importance: z.number().min(0).max(1),
  covered_by_resume: z.boolean(),
  matched_resume_skill_raw: z.string().nullable(),
  coverage_strength: coverageStrengthSchema,
  gap_reason: z.string()
});

export const canonicalMarketSchema = z.object({
  canonical_market: z.array(canonicalMarketItemSchema)
});

export type CanonicalMarketOutput = z.infer<typeof canonicalMarketSchema>;
