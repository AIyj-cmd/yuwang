export const AI_JUDGE_SCORE_VERSION = 'ai_judge_v1';
export const AI_JUDGE_FALLBACK_SCORE_VERSION = 'ai_judge_v1_fallback';
export const AI_JUDGE_PROMPT_KEY = 'ai_judge_system_prompt';
export const AI_JUDGE_PROMPT_NAME = 'AI 评分裁判系统提示词';
export const AI_JUDGE_PROVIDER_DEEPSEEK = 'deepseek';
export const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-pro';
export const DEFAULT_DEEPSEEK_TIMEOUT_MS = 15000;

export type AiIntensity = 'low' | 'medium' | 'high' | 'god';
export type AiOutcome = 'safe' | 'close_call' | 'caught' | 'countered';

export type AiSpecialBonus = {
  label: string;
  points: number;
};

export type AiJudgeResult = {
  valid: boolean;
  reason?: string;
  intensity?: AiIntensity;
  outcome?: AiOutcome;
  specialBonuses?: AiSpecialBonus[];
  comment: string;
};

export type AiJudgeFallbackReason =
  | 'missing_api_key'
  | 'timeout'
  | 'invalid_json'
  | 'schema_error'
  | 'empty_response'
  | 'invalid_prompt';

export type AiJudgePromptMeta = {
  key: string;
  content: string;
  version: string | number;
};

export type AiJudgeInput = {
  duration: string;
  activityText: string;
  storyText: string;
  slackingType?: string;
  extraNote?: string;
};

export type ScoreBreakdown = {
  baseScore: number;
  durationScore: number;
  durationBaseScore: number;
  durationMultiplier: number;
  riskMultiplier: number;
  disguiseBonus: number;
  creativityBonus: number;
  duration?: string;
  durationLabel?: string;
  intensity?: AiIntensity;
  intensityLabel?: string;
  intensityMultiplier?: number;
  outcome?: AiOutcome;
  outcomeLabel?: string;
  outcomeBonus?: number;
  specialBonuses?: AiSpecialBonus[];
  specialBonusTotal?: number;
  rawScore?: number;
  displayScore?: number;
  fishPowerScore: number;
  scoreVersion: string;
  aiProvider?: string;
  aiModel?: string;
  promptKey?: string;
  promptVersion?: string | number;
  fallback?: boolean;
  fallbackReason?: AiJudgeFallbackReason;
  valid?: boolean;
  reason?: string;
  comment?: string;
};

