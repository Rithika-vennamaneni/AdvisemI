import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../env.js';
import { logger } from '../util/logger.js';
import { safeJsonParse } from '../util/json.js';
import { canonicalMarketSchema } from './schema.js';
import { buildGapPrompt } from './gapPrompt.js';
import type { GeminiCanonicalMarket, MarketSkillDistinct, ResumeSkill } from '../gap/types.js';

type GeminiInput = {
  resumeSkills: ResumeSkill[];
  marketSkills: MarketSkillDistinct[];
  marketSkillInputSet: Set<string>;
};

type ValidationResult = { ok: true; value: GeminiCanonicalMarket } | { ok: false; error: string };

const validateOutput = (
  parsed: unknown,
  expectedCount: number,
  inputSet: Set<string>
): ValidationResult => {
  const schemaResult = canonicalMarketSchema.safeParse(parsed);
  if (!schemaResult.success) {
    return { ok: false, error: schemaResult.error.message };
  }
  const output = schemaResult.data as GeminiCanonicalMarket;
  if (output.canonical_market.length !== expectedCount) {
    return { ok: false, error: `canonical_market length ${output.canonical_market.length} does not match expected ${expectedCount}` };
  }
  const outputSet = new Set(output.canonical_market.map((item) => item.market_skill_raw));
  if (outputSet.size !== expectedCount) {
    return { ok: false, error: 'canonical_market contains duplicate market_skill_raw entries' };
  }
  for (const item of output.canonical_market) {
    if (!inputSet.has(item.market_skill_raw)) {
      return { ok: false, error: `Unexpected market_skill_raw: ${item.market_skill_raw}` };
    }
  }
  return { ok: true, value: output };
};

const callModel = async (prompt: string): Promise<string> => {
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: env.MODEL });
  const result = await model.generateContent(prompt);
  return result.response.text();
};

export const runGeminiGapAnalysis = async (input: GeminiInput): Promise<GeminiCanonicalMarket> => {
  const prompt = buildGapPrompt(input.resumeSkills, input.marketSkills, { strict: false });
  const responseText = await callModel(prompt);
  const parsed = safeJsonParse<GeminiCanonicalMarket>(responseText);
  if (parsed.ok) {
    const validated = validateOutput(parsed.value, input.marketSkills.length, input.marketSkillInputSet);
    if (validated.ok) {
      logger.info('Gemini output validated', { stage: 'initial' });
      return validated.value;
    }
    logger.warn('Gemini validation failed', { stage: 'initial', error: validated.error });
  } else {
    logger.warn('Gemini JSON parse failed', { stage: 'initial', error: parsed.error });
  }

  const retryPrompt = buildGapPrompt(input.resumeSkills, input.marketSkills, {
    strict: true,
    priorError: parsed.ok ? 'Validation failed' : parsed.error
  });
  const retryText = await callModel(retryPrompt);
  const retryParsed = safeJsonParse<GeminiCanonicalMarket>(retryText);
  if (!retryParsed.ok) {
    throw new Error(`Gemini JSON parse failed after retry: ${retryParsed.error}`);
  }
  const retryValidated = validateOutput(
    retryParsed.value,
    input.marketSkills.length,
    input.marketSkillInputSet
  );
  if (!retryValidated.ok) {
    throw new Error(`Gemini validation failed after retry: ${retryValidated.error}`);
  }
  logger.info('Gemini output validated', { stage: 'retry' });
  return retryValidated.value;
};
