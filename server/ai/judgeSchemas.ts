import { z } from 'zod';
import {
  AI_JUDGE_FALLBACK_SCORE_VERSION,
  AI_JUDGE_PROMPT_KEY,
  AI_JUDGE_PROVIDER_DEEPSEEK,
  AI_JUDGE_SCORE_VERSION,
  DEFAULT_DEEPSEEK_MODEL,
  type AiJudgeFallbackReason
} from '../../shared/aiJudgeTypes.js';

export const AiIntensitySchema = z.enum(['low', 'medium', 'high', 'god']);
export const AiOutcomeSchema = z.enum(['safe', 'close_call', 'caught', 'countered']);

export const AiSpecialBonusSchema = z.object({
  label: z.string().trim().min(1).max(40),
  points: z.number()
});

export const AiJudgeResultSchema = z.object({
  valid: z.boolean(),
  reason: z.string().trim().max(80).optional().default(''),
  intensity: AiIntensitySchema.optional(),
  outcome: AiOutcomeSchema.optional(),
  specialBonuses: z.array(AiSpecialBonusSchema).max(6).optional().default([]),
  comment: z.string().trim().min(1).max(160)
});

export const ScoreBreakdownSchema = z.object({
  baseScore: z.number(),
  durationScore: z.number().optional(),
  durationBaseScore: z.number().optional(),
  durationMultiplier: z.number().optional(),
  riskMultiplier: z.number().optional(),
  disguiseBonus: z.number().optional(),
  creativityBonus: z.number().optional(),
  duration: z.string(),
  durationLabel: z.string(),
  intensity: AiIntensitySchema,
  intensityLabel: z.string(),
  intensityMultiplier: z.number(),
  outcome: AiOutcomeSchema,
  outcomeLabel: z.string(),
  outcomeBonus: z.number(),
  specialBonuses: z.array(AiSpecialBonusSchema),
  specialBonusTotal: z.number(),
  specialBonusScore: z.number().optional(),
  descriptionQualityScore: z.number().optional(),
  rawScore: z.number(),
  displayScore: z.number(),
  fishPowerScore: z.number(),
  singleRecordScoreMax: z.number().optional(),
  scoreVersion: z.string(),
  aiProvider: z.string(),
  aiModel: z.string(),
  promptKey: z.string(),
  promptVersion: z.union([z.string(), z.number()]),
  fallback: z.boolean(),
  fallbackReason: z.string().optional(),
  valid: z.boolean().optional(),
  reason: z.string().optional(),
  comment: z.string().optional()
});

export const FALLBACK_REASON_VALUES = [
  'missing_api_key',
  'timeout',
  'invalid_json',
  'schema_error',
  'empty_response',
  'invalid_prompt'
] as const satisfies readonly AiJudgeFallbackReason[];

export const DEFAULT_SCORE_META = {
  aiProvider: AI_JUDGE_PROVIDER_DEEPSEEK,
  aiModel: DEFAULT_DEEPSEEK_MODEL,
  promptKey: AI_JUDGE_PROMPT_KEY,
  promptVersion: '1',
  scoreVersion: AI_JUDGE_SCORE_VERSION,
  fallbackScoreVersion: AI_JUDGE_FALLBACK_SCORE_VERSION
} as const;

export type ParsedAiJudgeResult = z.infer<typeof AiJudgeResultSchema>;
