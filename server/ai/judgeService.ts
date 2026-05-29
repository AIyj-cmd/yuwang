import {
  AI_JUDGE_FALLBACK_SCORE_VERSION,
  AI_JUDGE_PROMPT_KEY,
  AI_JUDGE_PROVIDER_DEEPSEEK,
  AI_JUDGE_SCORE_VERSION,
  DEFAULT_DEEPSEEK_MODEL,
  type AiJudgeFallbackReason,
  type AiJudgeInput,
  type AiJudgePromptMeta,
  type AiJudgeResult,
  type AiSpecialBonus,
  type ScoreBreakdown
} from '../../shared/aiJudgeTypes.js';
import {
  AI_JUDGE_SPECIAL_BONUS_ITEM_MAX,
  AI_JUDGE_SPECIAL_BONUS_MAX,
  AI_JUDGE_SPECIAL_BONUS_MIN,
  AI_JUDGE_SPECIAL_BONUS_SCORE_MAX,
  AI_JUDGE_SPECIAL_BONUS_TOTAL_MAX,
  INTENSITY_RULES,
  OUTCOME_RULES,
  SINGLE_RECORD_FISH_POWER_SCORE_MAX,
  calculateDescriptionQualityScore,
  clampSingleRecordFishPowerScore,
  getDurationRule,
  normalizeDurationKey
} from '../../shared/scoring.js';
import { DEFAULT_AI_JUDGE_SYSTEM_PROMPT } from '../../shared/aiJudgePrompt.js';
import { callDeepSeekJudge, fallbackJudgeResult, getDeepSeekConfig, JudgeFallbackError } from './deepseekClient.js';
import type { ParsedAiJudgeResult } from './judgeSchemas.js';

export type GenerateAiJudgeOptions = {
  prompt?: AiJudgePromptMeta;
  callJudge?: typeof callDeepSeekJudge;
};

export type AiJudgeGeneration = {
  judgeResult: ParsedAiJudgeResult;
  rawText: string;
  fallback: boolean;
  fallbackReason?: AiJudgeFallbackReason;
  aiProvider: string;
  aiModel: string;
  promptKey: string;
  promptVersion: string | number;
};

export type ScoredJudgeResult = {
  judgeResult: AiJudgeResult;
  rawText: string;
  breakdown: ScoreBreakdown;
  comment: string;
};

type ResolvedPrompt = {
  prompt: AiJudgePromptMeta;
  fallbackReason?: AiJudgeFallbackReason;
};

export const isPromptUsable = (content: string): boolean => {
  const trimmed = content.trim();
  return trimmed.length > 0 && trimmed.length <= 12000 && trimmed.includes('valid') && trimmed.includes('comment');
};

const defaultPromptMeta = (): AiJudgePromptMeta => ({
  key: AI_JUDGE_PROMPT_KEY,
  content: DEFAULT_AI_JUDGE_SYSTEM_PROMPT,
  version: '1'
});

const resolvePrompt = async (options?: GenerateAiJudgeOptions): Promise<ResolvedPrompt> => {
  if (options?.prompt) {
    return isPromptUsable(options.prompt.content)
      ? { prompt: options.prompt }
      : { prompt: defaultPromptMeta(), fallbackReason: 'invalid_prompt' };
  }

  try {
    const { getActiveAiPrompt } = await import('../database.js');
    const prompt = getActiveAiPrompt(AI_JUDGE_PROMPT_KEY);
    if (prompt && isPromptUsable(prompt.content)) {
      return {
        prompt: {
          key: prompt.key,
          content: prompt.content,
          version: prompt.version
        }
      };
    }
    return prompt ? { prompt: defaultPromptMeta(), fallbackReason: 'invalid_prompt' } : { prompt: defaultPromptMeta() };
  } catch {
    return { prompt: defaultPromptMeta() };
  }
};

const fallbackGeneration = (
  input: AiJudgeInput,
  reason: AiJudgeFallbackReason,
  prompt: AiJudgePromptMeta | null
): AiJudgeGeneration => {
  const config = getDeepSeekConfig();
  return {
    judgeResult: fallbackJudgeResult(input, reason),
    rawText: '',
    fallback: true,
    fallbackReason: reason,
    aiProvider: process.env.AI_JUDGE_PROVIDER ?? AI_JUDGE_PROVIDER_DEEPSEEK,
    aiModel: config.model || DEFAULT_DEEPSEEK_MODEL,
    promptKey: prompt?.key ?? AI_JUDGE_PROMPT_KEY,
    promptVersion: prompt?.version ?? '1'
  };
};

export const generateAiJudgeResult = async (input: AiJudgeInput, options?: GenerateAiJudgeOptions): Promise<AiJudgeGeneration> => {
  const resolvedPrompt = await resolvePrompt(options);
  const { prompt } = resolvedPrompt;

  const config = getDeepSeekConfig();
  const provider = process.env.AI_JUDGE_PROVIDER ?? AI_JUDGE_PROVIDER_DEEPSEEK;
  if (provider !== AI_JUDGE_PROVIDER_DEEPSEEK) {
    return fallbackGeneration(input, 'missing_api_key', prompt);
  }

  try {
    const response = await (options?.callJudge ?? callDeepSeekJudge)({
      judgeInput: input,
      systemPrompt: prompt.content,
      model: config.model
    });
    return {
      judgeResult: response.parsed,
      rawText: response.rawText,
      fallback: Boolean(resolvedPrompt.fallbackReason),
      fallbackReason: resolvedPrompt.fallbackReason,
      aiProvider: provider,
      aiModel: response.model,
      promptKey: prompt.key,
      promptVersion: prompt.version
    };
  } catch (error) {
    const reason = error instanceof JudgeFallbackError ? error.reason : 'schema_error';
    return fallbackGeneration(input, reason, prompt);
  }
};

const clampBonus = (bonus: AiSpecialBonus): AiSpecialBonus | null => {
  const label = String(bonus.label ?? '').trim();
  if (!label) return null;
  const points = Number(bonus.points);
  if (!Number.isFinite(points) || points <= 0) return null;
  const roundedPoints = Math.round(points);
  if (roundedPoints <= 0) return null;
  return {
    label: label.slice(0, 40),
    points: Math.min(AI_JUDGE_SPECIAL_BONUS_MAX, Math.max(AI_JUDGE_SPECIAL_BONUS_MIN, roundedPoints))
  };
};

const sanitizeSpecialBonuses = (bonuses: AiSpecialBonus[] | undefined): { specialBonuses: AiSpecialBonus[]; specialBonusTotal: number } => {
  const cleaned: AiSpecialBonus[] = [];
  let total = 0;

  for (const bonus of (bonuses ?? []).slice(0, AI_JUDGE_SPECIAL_BONUS_ITEM_MAX)) {
    const sanitized = clampBonus(bonus);
    if (!sanitized) continue;
    const remaining = AI_JUDGE_SPECIAL_BONUS_TOTAL_MAX - total;
    if (remaining <= AI_JUDGE_SPECIAL_BONUS_MIN) break;
    const points = Math.min(sanitized.points, remaining);
    cleaned.push({ ...sanitized, points });
    total += points;
  }

  return { specialBonuses: cleaned, specialBonusTotal: total };
};

const WORK_ONLY_PATTERN =
  /认真上班|认真工作|努力上班|努力工作|没有摸鱼|不摸鱼|正常工作|好好工作|加班完成|today i worked|not slacking|worked hard/i;

const SLACKING_EVIDENCE_PATTERN =
  /摸鱼|划水|偷懒|开小差|假装|伪装|摸了|茶水间|厕所|会议|开会|老板|工位|上班|Excel|需求文档|刷|看剧|看视频|短视频|视频|游戏|小说|slack|slacking|pretend|browse|video|game|meeting|spreadsheet/i;

const DISCUSSION_ONLY_PATTERN =
  /(?:讨论|聊|解释|研究).{0,8}摸鱼|摸鱼.{0,8}(?:这个词|概念|含义|意思)/i;

const THIRD_PARTY_ONLY_PATTERN =
  /(?:同事|别人|其他人|他们|她们|他|她).{0,16}(?:摸鱼|划水|偷懒|开小差).{0,24}我.{0,16}(?:认真|工作|上班)|我.{0,16}(?:认真|工作|上班).{0,24}(?:同事|别人|其他人|他们|她们|他|她).{0,16}(?:摸鱼|划水|偷懒|开小差)/i;

const MEANINGFUL_TEXT_PATTERN = /[A-Za-z0-9\u4e00-\u9fff]/;
const SLACKING_KEYWORD_PATTERN = /摸鱼|划水|偷懒|开小差/gi;

const normalizedEventText = (input: AiJudgeInput): string =>
  `${input.activityText} ${input.storyText} ${input.extraNote ?? ''}`.trim();

const isKeywordStuffingOnly = (text: string): boolean => {
  const remainder = text.replace(SLACKING_KEYWORD_PATTERN, '').replace(/[^A-Za-z0-9\u4e00-\u9fff]+/g, '');
  return remainder.length <= 1;
};

const isBackendInvalidNonSlacking = (input: AiJudgeInput): boolean => {
  const text = normalizedEventText(input);
  if (text.length < 4 || !MEANINGFUL_TEXT_PATTERN.test(text)) return true;
  if (WORK_ONLY_PATTERN.test(text)) return true;
  if (DISCUSSION_ONLY_PATTERN.test(text)) return true;
  if (THIRD_PARTY_ONLY_PATTERN.test(text)) return true;
  return isKeywordStuffingOnly(text);
};

const hasBackendSlackingEvidence = (input: AiJudgeInput): boolean => {
  const text = normalizedEventText(input);
  if (isBackendInvalidNonSlacking(input)) return false;
  return SLACKING_EVIDENCE_PATTERN.test(text);
};

export const deterministicScore = (
  input: AiJudgeInput,
  generation: AiJudgeGeneration
): { breakdown: ScoreBreakdown; comment: string } => {
  const normalizedDuration = normalizeDurationKey(input.duration);
  const durationRule = getDurationRule(input.duration);
  const fallback = generation.fallback;
  const fallbackReason = generation.fallbackReason ?? (fallback ? 'schema_error' : undefined);
  const baseMeta = {
    aiProvider: generation.aiProvider,
    aiModel: generation.aiModel,
    promptKey: generation.promptKey,
    promptVersion: generation.promptVersion,
    fallback,
    ...(fallbackReason ? { fallbackReason } : {})
  };

  if (!normalizedDuration || !durationRule) {
    const breakdown: ScoreBreakdown = {
      baseScore: 0,
      durationScore: 0,
      durationBaseScore: 0,
      durationMultiplier: 1,
      riskMultiplier: 1,
      disguiseBonus: 0,
      creativityBonus: 0,
      duration: input.duration,
      durationLabel: input.duration,
      intensity: 'low',
      intensityLabel: INTENSITY_RULES.low.label,
      intensityMultiplier: INTENSITY_RULES.low.multiplier,
      outcome: 'safe',
      outcomeLabel: OUTCOME_RULES.safe.label,
      outcomeBonus: OUTCOME_RULES.safe.bonus,
      specialBonuses: [],
      specialBonusTotal: 0,
      rawScore: 0,
      displayScore: 0,
      fishPowerScore: 0,
      singleRecordScoreMax: SINGLE_RECORD_FISH_POWER_SCORE_MAX,
      scoreVersion: fallback ? AI_JUDGE_FALLBACK_SCORE_VERSION : AI_JUDGE_SCORE_VERSION,
      valid: false,
      reason: 'invalid_duration',
      comment: '这个时长格式不对，裁判席没法结算。摸鱼可以随性，交卷别乱填。',
      ...baseMeta
    };
    return { breakdown, comment: breakdown.comment ?? '' };
  }

  const judge = generation.judgeResult;
  const judgeReason = judge.reason ?? '';
  const backendInvalidNonSlacking = isBackendInvalidNonSlacking(input);
  // AI can false-negative terse but valid community posts such as "摸鱼记录".
  // Keep true invalid/work-only/noise entries at 0, but let backend-owned
  // deterministic evidence produce a conservative 0-10 score.
  const aiFalseNegativeGuarded =
    !backendInvalidNonSlacking && judge.valid === false && judgeReason === 'not_slacking_event' && hasBackendSlackingEvidence(input);
  const valid = backendInvalidNonSlacking ? false : judge.valid !== false || aiFalseNegativeGuarded;
  const reason = backendInvalidNonSlacking ? 'not_slacking_event' : aiFalseNegativeGuarded ? 'ai_not_slacking_guarded_by_backend' : judgeReason;
  const isNonSlacking = !valid && reason === 'not_slacking_event';
  const intensity = judge.intensity && judge.intensity in INTENSITY_RULES ? judge.intensity : 'low';
  const outcome = judge.outcome && judge.outcome in OUTCOME_RULES ? judge.outcome : 'safe';
  const intensityRule = INTENSITY_RULES[intensity];
  const outcomeRule = OUTCOME_RULES[outcome];
  const { specialBonuses, specialBonusTotal } = valid ? sanitizeSpecialBonuses(judge.specialBonuses) : { specialBonuses: [], specialBonusTotal: 0 };
  const baseScore = Number(durationRule.baseScore ?? durationRule.score ?? 0);
  const descriptionQualityScore = valid ? calculateDescriptionQualityScore(input) : 0;
  const specialBonusScore = valid
    ? Number(Math.min(AI_JUDGE_SPECIAL_BONUS_SCORE_MAX, (specialBonusTotal / AI_JUDGE_SPECIAL_BONUS_TOTAL_MAX) * AI_JUDGE_SPECIAL_BONUS_SCORE_MAX).toFixed(1))
    : 0;
  // Single-record Fish Power Score is now a normalized 0-10 value. AI output
  // chooses categorical evidence only; the backend owns the final score and
  // clamps every path before persistence.
  const rawScore = valid
    ? Number((baseScore + intensityRule.score + outcomeRule.bonus + descriptionQualityScore + specialBonusScore).toFixed(1))
    : 0;
  const fishPowerScore = clampSingleRecordFishPowerScore(rawScore);
  const displayScore = fishPowerScore;
  const scoreVersion = fallback ? AI_JUDGE_FALLBACK_SCORE_VERSION : AI_JUDGE_SCORE_VERSION;
  const comment =
    judge.comment ||
    (isNonSlacking
      ? '这不像是摸鱼事迹。你要么今天真的很努力，要么还没想好怎么摸。重新提交一个，我等着。'
      : '裁判席暂时没听懂这条鱼怎么摸的，先按保守结算。');

  const breakdown: ScoreBreakdown = {
    baseScore,
    durationScore: baseScore,
    durationBaseScore: baseScore,
    durationMultiplier: 1,
    // User-selected risk/disguise/creativity are persisted as metadata. Under
    // the AI judge score version, scoring uses judge-derived intensity,
    // outcome, and special bonuses to avoid trusting client-controlled enums.
    riskMultiplier: intensityRule.multiplier,
    disguiseBonus: 0,
    creativityBonus: specialBonusScore,
    duration: normalizedDuration,
    durationLabel: durationRule.label,
    intensity,
    intensityLabel: intensityRule.label,
    intensityMultiplier: intensityRule.multiplier,
    outcome,
    outcomeLabel: outcomeRule.label,
    outcomeBonus: valid ? outcomeRule.bonus : 0,
    specialBonuses,
    specialBonusTotal,
    specialBonusScore,
    descriptionQualityScore,
    rawScore,
    displayScore,
    fishPowerScore,
    singleRecordScoreMax: SINGLE_RECORD_FISH_POWER_SCORE_MAX,
    scoreVersion,
    valid,
    reason,
    comment,
    ...baseMeta
  };

  return { breakdown, comment };
};

export const scoreRecordWithAiJudge = async (input: AiJudgeInput, options?: GenerateAiJudgeOptions): Promise<ScoredJudgeResult> => {
  const generation = await generateAiJudgeResult(input, options);
  const scored = deterministicScore(input, generation);
  return {
    judgeResult: generation.judgeResult,
    rawText: generation.rawText,
    breakdown: scored.breakdown,
    comment: scored.comment
  };
};
