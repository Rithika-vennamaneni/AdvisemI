import { env } from '../env.js';

type OpenAIResponseOutput = {
  type?: string;
  content?: Array<{ type?: string; text?: string }>;
};

type OpenAIResponse = {
  output?: OpenAIResponseOutput[];
};

const getBaseUrl = (): string => env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
const getModel = (): string => env.OPENAI_MODEL ?? 'gpt-4o-mini';

const getMaxOutputTokens = (): number => {
  const raw = env.OPENAI_MAX_OUTPUT_TOKENS;
  if (!raw) return 500;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 500;
};

const getTemperature = (): number | undefined => {
  const raw = env.OPENAI_TEMPERATURE;
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
};

const extractOutputText = (data: OpenAIResponse): string => {
  const outputs = data.output ?? [];
  const texts: string[] = [];
  outputs.forEach((item) => {
    if (!item || item.type !== 'message') return;
    (item.content ?? []).forEach((part) => {
      if (part?.type === 'output_text' && part.text) {
        texts.push(part.text);
      }
    });
  });
  return texts.join('\n');
};

export const runOpenAI = async (input: {
  instructions?: string;
  input: string;
  maxOutputTokens?: number;
  temperature?: number;
  jsonObject?: boolean;
}): Promise<string> => {
  if (!env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const body: Record<string, unknown> = {
    model: getModel(),
    input: input.input,
    max_output_tokens: input.maxOutputTokens ?? getMaxOutputTokens(),
    store: false
  };

  const temperature = input.temperature ?? getTemperature();
  if (temperature !== undefined) {
    body.temperature = temperature;
  }
  if (input.instructions) {
    body.instructions = input.instructions;
  }
  if (input.jsonObject) {
    body.text = { format: { type: 'json_object' } };
  }

  const res = await fetch(`${getBaseUrl()}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    let detail = '';
    try {
      const errorBody = (await res.json()) as { error?: { message?: string } };
      detail = errorBody?.error?.message ? ` - ${errorBody.error.message}` : '';
    } catch {
      // ignore parse errors
    }
    throw new Error(`OpenAI request failed (${res.status})${detail}`);
  }

  const data = (await res.json()) as OpenAIResponse;
  return extractOutputText(data);
};
