import OpenAI from 'openai';
import {
  DEFAULT_DEEPSEEK_BASE_URL,
  DEFAULT_DEEPSEEK_MODEL,
  DEFAULT_DEEPSEEK_TIMEOUT_MS,
  type AiJudgeFallbackReason,
  type AiJudgeInput
} from '../../shared/aiJudgeTypes.js';
import { AiJudgeResultSchema, type ParsedAiJudgeResult } from './judgeSchemas.js';

export class JudgeFallbackError extends Error {
  reason: AiJudgeFallbackReason;

  constructor(reason: AiJudgeFallbackReason, message = reason) {
    super(message);
    this.name = 'JudgeFallbackError';
    this.reason = reason;
  }
}

export const getDeepSeekConfig = () => ({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
  baseURL: process.env.DEEPSEEK_BASE_URL ?? DEFAULT_DEEPSEEK_BASE_URL,
  model: process.env.DEEPSEEK_MODEL ?? DEFAULT_DEEPSEEK_MODEL,
  timeoutMs: Number(process.env.DEEPSEEK_TIMEOUT_MS ?? DEFAULT_DEEPSEEK_TIMEOUT_MS)
});

export const createDeepSeekClient = (): OpenAI => {
  const config = getDeepSeekConfig();
  if (!config.apiKey) {
    throw new JudgeFallbackError('missing_api_key');
  }

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: Number.isFinite(config.timeoutMs) ? config.timeoutMs : DEFAULT_DEEPSEEK_TIMEOUT_MS
  });
};

const userPrompt = (input: AiJudgeInput): string =>
  JSON.stringify(
    {
      duration: input.duration,
      activityText: input.activityText,
      slackingType: input.slackingType ?? input.activityText,
      storyText: input.storyText,
      extraNote: input.extraNote ?? ''
    },
    null,
    2
  );

export const parseJudgeJson = (rawText: string): ParsedAiJudgeResult => {
  const text = rawText.trim();
  if (!text) throw new JudgeFallbackError('empty_response');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new JudgeFallbackError('invalid_json');
  }

  const result = AiJudgeResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new JudgeFallbackError('schema_error');
  }
  return result.data;
};

const getErrorField = (error: unknown, field: 'name' | 'message' | 'code' | 'type'): string => {
  if (typeof error !== 'object' || error === null || !(field in error)) return '';
  const value = (error as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : '';
};

const getErrorCause = (error: unknown): unknown => {
  if (typeof error !== 'object' || error === null || !('cause' in error)) return null;
  return (error as { cause?: unknown }).cause;
};

const isTimeoutError = (error: unknown): boolean => {
  const maybeStatus = typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status?: number }).status) : 0;
  if (maybeStatus === 408) return true;

  const fingerprint = [
    getErrorField(error, 'name'),
    getErrorField(error, 'message'),
    getErrorField(error, 'code'),
    getErrorField(error, 'type'),
    getErrorField(getErrorCause(error), 'name'),
    getErrorField(getErrorCause(error), 'message'),
    getErrorField(getErrorCause(error), 'code'),
    getErrorField(getErrorCause(error), 'type')
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    fingerprint.includes('timeout') ||
    fingerprint.includes('timed out') ||
    fingerprint.includes('etimedout') ||
    fingerprint.includes('aborterror')
  );
};

export const callDeepSeekJudge = async (input: {
  judgeInput: AiJudgeInput;
  systemPrompt: string;
  model?: string;
}): Promise<{ rawText: string; parsed: ParsedAiJudgeResult; model: string }> => {
  const config = getDeepSeekConfig();
  const model = input.model ?? config.model;
  const client = createDeepSeekClient();

  try {
    const completion = await client.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      stream: false,
      max_tokens: 1000,
      temperature: 0.7,
      messages: [
        { role: 'system', content: input.systemPrompt },
        {
          role: 'user',
          content: `请只输出可 JSON.parse 的 json 对象。用户提交如下：\n${userPrompt(input.judgeInput)}`
        }
      ]
    });
    const rawText = completion.choices[0]?.message?.content ?? '';
    return { rawText, parsed: parseJudgeJson(rawText), model };
  } catch (error) {
    if (error instanceof JudgeFallbackError) throw error;
    if (isTimeoutError(error)) {
      throw new JudgeFallbackError('timeout');
    }
    throw new JudgeFallbackError('empty_response');
  }
};

export const fallbackJudgeResult = (input: AiJudgeInput, reason: AiJudgeFallbackReason): ParsedAiJudgeResult => {
  const text = `${input.activityText} ${input.storyText} ${input.extraNote ?? ''}`.trim();
  const normalized = text.toLowerCase();
  const looksEmptyOrNoise = text.length < 4 || /^[\W_]+$/.test(text);
  const saysWorkOnly =
    /认真上班|努力上班|没有摸鱼|不摸鱼|正常工作|好好工作|加班完成|today i worked|not slacking|worked hard/i.test(normalized);

  if (looksEmptyOrNoise || saysWorkOnly) {
    return {
      valid: false,
      reason: 'not_slacking_event',
      intensity: 'low',
      outcome: 'safe',
      specialBonuses: [],
      comment: '这不像是摸鱼事迹。你要么今天真的很努力，要么还没想好怎么摸。重新提交一个，我等着。'
    };
  }

  return {
    valid: true,
    reason,
    intensity: 'low',
    outcome: 'safe',
    specialBonuses: [],
    comment: '这次裁判席先按保守档结算：你像是摸了，但证据朴素得有点省电。先记一笔安全分，等你下次把荒诞细节交代明白。'
  };
};
