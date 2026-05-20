import { SLACKING_TYPE_OPTIONS } from './slackingTypes.js';
import {
  AI_JUDGE_SCORE_VERSION,
  AI_JUDGE_FALLBACK_SCORE_VERSION,
  AI_JUDGE_PROVIDER_DEEPSEEK,
  AI_JUDGE_PROMPT_KEY,
  DEFAULT_DEEPSEEK_MODEL,
  type AiIntensity,
  type AiOutcome,
  type AiSpecialBonus,
  type ScoreBreakdown
} from './aiJudgeTypes.js';

export {
  AI_JUDGE_SCORE_VERSION,
  AI_JUDGE_FALLBACK_SCORE_VERSION,
  AI_JUDGE_PROVIDER_DEEPSEEK,
  AI_JUDGE_PROMPT_KEY,
  DEFAULT_DEEPSEEK_MODEL,
  type AiIntensity,
  type AiOutcome,
  type AiSpecialBonus,
  type ScoreBreakdown
};

export type RuleOption = {
  key: string;
  id?: string;
  label: string;
  score?: number;
  baseScore?: number;
  multiplier?: number;
  bonus?: number;
};

export type RecordInput = {
  nickname: string;
  activityText: string;
  storyText?: string;
  slackingType?: string;
  duration: string;
  risk?: string;
  disguise?: string;
  creativity?: string;
  description?: string;
};

export type SafetyLevel = 'pass' | 'review' | 'block';

export type SafetyResult = {
  level: SafetyLevel;
  sensitiveTerms: string[];
  warnings: string[];
};

export const MAX_DESCRIPTION_LENGTH = 180;
export const MAX_ACTIVITY_TEXT_LENGTH = 80;
export const DURATION_SCORE_VERSION = 'duration_v3';
export const TIME_SCORE_VERSION = DURATION_SCORE_VERSION;
export const AI_JUDGE_DURATION_BASE_SCORES = {
  '30分钟以下': 20,
  '30分钟-1小时': 40,
  '1-2小时': 65,
  '2-4小时': 90,
  '4小时以上/全天': 120
} as const;

export const LEGACY_DURATION_KEY_MAP: Record<string, keyof typeof AI_JUDGE_DURATION_BASE_SCORES> = {
  '0-10': '30分钟以下',
  '10-30': '30分钟以下',
  '30-60': '30分钟-1小时',
  '1-2h': '1-2小时',
  '2-4h': '2-4小时',
  '4h-plus': '4小时以上/全天',
  '30分钟–1小时': '30分钟-1小时',
  '1–2小时': '1-2小时',
  '2–4小时': '2-4小时'
};

export const INTENSITY_RULES = {
  low: { label: '低烈度', multiplier: 1.0 },
  medium: { label: '中烈度', multiplier: 1.3 },
  high: { label: '高烈度', multiplier: 1.6 },
  god: { label: '神烈度', multiplier: 2.0 }
} as const satisfies Record<AiIntensity, { label: string; multiplier: number }>;

export const OUTCOME_RULES = {
  safe: { label: '全身而退', bonus: 0 },
  close_call: { label: '有惊无险', bonus: 15 },
  caught: { label: '被抓现行', bonus: 30 },
  countered: { label: '反将一军', bonus: 50 }
} as const satisfies Record<AiOutcome, { label: string; bonus: number }>;

export const AI_JUDGE_SPECIAL_BONUS_MIN = 10;
export const AI_JUDGE_SPECIAL_BONUS_MAX = 30;
export const AI_JUDGE_SPECIAL_BONUS_TOTAL_MAX = 60;
export const AI_JUDGE_SPECIAL_BONUS_ITEM_MAX = 6;

export const SAFETY_NOTICE =
  '请不要提交公司机密、个人隐私、员工证件、聊天记录、客户资料或未匿名化截图。\n本平台仅供娱乐，不支持真实违反职场规则的行为。';

export const SENSITIVE_TERMS = [
  '公司机密',
  '商业秘密',
  '客户资料',
  '客户信息',
  '客户名',
  '公司名',
  '员工证',
  '身份证',
  '手机号',
  '住址',
  '聊天记录',
  '截图',
  '合同',
  '报价',
  '真实公司名',
  '部门名称',
  '客户名称',
  '项目代号'
];

const SAFETY_PATTERNS = [
  { label: '疑似手机号', pattern: /1[3-9]\d{9}/ },
  { label: '疑似邮箱', pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { label: '疑似身份证号', pattern: /\d{17}[\dXx]/ },
  { label: '疑似外部链接', pattern: /https?:\/\/|www\./i },
  { label: '疑似公司全称', pattern: /[\u4e00-\u9fa5]{2,}(有限责任公司|股份有限公司|科技有限公司|集团)/ }
];

export const SLACKING_TYPES = SLACKING_TYPE_OPTIONS.map((item) => ({
  key: item.id,
  label: item.label,
  score: item.score
})) satisfies RuleOption[];

export const DURATION_SCORE_RULES = [
  { key: '30分钟以下', id: 'under_30m', label: '30分钟以下', score: 20, baseScore: 20 },
  { key: '30分钟-1小时', id: '30m_1h', label: '30分钟-1小时', score: 40, baseScore: 40 },
  { key: '1-2小时', id: '1_2h', label: '1-2小时', score: 65, baseScore: 65 },
  { key: '2-4小时', id: '2_4h', label: '2-4小时', score: 90, baseScore: 90 },
  { key: '4小时以上/全天', id: '4h_plus', label: '4小时以上/全天', score: 120, baseScore: 120 }
] as const satisfies readonly RuleOption[];

export const DURATIONS = DURATION_SCORE_RULES;
export const DURATION_INPUT_KEYS = [
  ...DURATION_SCORE_RULES.map((item) => item.key),
  ...Object.keys(LEGACY_DURATION_KEY_MAP)
] as const;

export const DURATION_SCORE_COMMENTS: Record<string, string> = {
  '30分钟以下': '裁判记录：这只是短暂离开水面换口气，安全，但别装得太史诗。',
  '30分钟-1小时': '裁判记录：一段合理但值得登记的精神漂移，够摸，但还没摸出神话。',
  '1-2小时': '裁判记录：半场失踪，表面还稳，已经有点办公室民间故事的味道。',
  '2-4小时': '裁判记录：工位还在，人类活动迹象明显减少，建议确认自己还在上班。',
  '4小时以上/全天': '裁判记录：今日鱼王候选，时长很有气势，真实性先放在旁边观察。',
  '0-10': '只是短暂离开水面呼吸了一下。',
  '10-30': '这是一段合理但值得记录的精神游离。',
  '30-60': '你的灵魂已经离开工位一小段时间。',
  '1-2h': '半场失踪，但依然保持了表面稳定。',
  '2-4h': '工位还在，人类活动迹象减少。',
  '4h-plus': '今日鱼王候选，建议先确认自己还在上班。'
};

export const DURATION_SCORE_TITLES: Record<string, string> = {
  '30分钟以下': '小憩鱼苗',
  '30分钟-1小时': '短暂潜水员',
  '1-2小时': '半场失踪鱼',
  '2-4小时': '工位蒸发者',
  '4小时以上/全天': '今日鱼王候选',
  '0-10': '小憩鱼苗',
  '10-30': '短暂潜水员',
  '30-60': '灵魂离席者',
  '1-2h': '半场失踪鱼',
  '2-4h': '工位蒸发者',
  '4h-plus': '今日鱼王候选'
};

export const RISKS = [
  { key: 'break-time', label: '休息时间', multiplier: 0.8 },
  { key: 'work-time', label: '正常工作时间', multiplier: 1.0 },
  { key: 'boss-nearby', label: '老板在附近', multiplier: 1.3 },
  { key: 'meeting', label: '会议中', multiplier: 1.5 },
  { key: 'screen-share', label: '屏幕共享或远程会议中', multiplier: 1.8 },
  { key: 'called-out', label: '被点名但成功圆过去', multiplier: 2.0 }
] as const satisfies readonly RuleOption[];

export const DISGUISES = [
  { key: 'window-switch', label: '熟练切换窗口', bonus: 5 },
  { key: 'headset-meeting', label: '戴耳机假装听会', bonus: 8 },
  { key: 'excel-ide', label: 'Excel 或 IDE 伪装', bonus: 12 },
  { key: 'multi-window', label: '多窗口掩护', bonus: 15 },
  { key: 'busy-status', label: '设置状态为忙碌', bonus: 20 },
  { key: 'auto-online', label: '自动化假在线', bonus: 30 },
  { key: 'answer-while-slacking', label: '摸鱼时仍能回答问题', bonus: 40 }
] as const satisfies readonly RuleOption[];

export const CREATIVITY_LEVELS = [
  { key: 'normal', label: '普通', bonus: 0 },
  { key: 'odd', label: '有点离谱', bonus: 10 },
  { key: 'showtime', label: '很有节目效果', bonus: 25 },
  { key: 'everyone-laughed', label: '让大家都笑了', bonus: 50 },
  { key: 'legendary', label: '传奇操作', bonus: 80 }
] as const satisfies readonly RuleOption[];

export const TITLE_LEVELS = [
  { min: 0, max: 99, title: '小鱼苗' },
  { min: 100, max: 499, title: '初级摸鱼员' },
  { min: 500, max: 999, title: '熟练摸鱼工' },
  { min: 1000, max: 2999, title: '工位老油条' },
  { min: 3000, max: 9999, title: '带薪摸鱼王' },
  { min: 10000, max: Number.POSITIVE_INFINITY, title: '终极鱼神' }
] as const;

export const LEADERBOARD_TYPES = [
  { key: 'today', label: '今日摸鱼王', description: '当日单次最高分' },
  { key: 'week', label: '本周带薪摸鱼榜', description: '本周累计最高分' },
  { key: 'month', label: '月赛摸鱼榜', description: '本月累计最高分' },
  { key: 'season', label: '赛季鱼王榜', description: '当前季度累计最高分' },
  { key: 'disguise', label: '伪装大师榜', description: '伪装加分最高' },
  { key: 'meeting', label: '会议摸鱼榜', description: '会议相关摸鱼记录' },
  { key: 'legendary', label: '传奇摸鱼王榜', description: '社区投票产生传奇记录' }
] as const;

export type LeaderboardType = (typeof LEADERBOARD_TYPES)[number]['key'];

export const BADGE_DEFINITIONS = [
  { key: 'first-catch', label: '第一条鱼', description: '提交第一条摸鱼记录' },
  { key: 'power-200', label: '破两百', description: '单次 Fish Power Score 达到 200' },
  { key: 'power-500', label: '高压鱼雷', description: '单次 Fish Power Score 达到 500' },
  { key: 'meeting-fish', label: '会议潜航员', description: '提交会议相关摸鱼记录' },
  { key: 'disguise-master', label: '伪装大师', description: '使用高阶伪装方式' },
  { key: 'legend-voter', label: '传奇见证者', description: '为传奇榜投票' },
  { key: 'social-fish', label: '茶水间发言人', description: '发布评论互动' }
] as const;

export const SUPPORTED_LOCALES = [
  { key: 'zh-CN', label: '简体中文' },
  { key: 'en-US', label: 'English' }
] as const;

const requireOption = <T extends readonly RuleOption[]>(
  options: T,
  key: string,
  valueName: string
): T[number] => {
  const normalizedKey = normalizeDurationKey(key) ?? key;
  const option = options.find((item) => item.key === key || item.key === normalizedKey);
  if (!option) {
    throw new Error(`Invalid ${valueName}: ${key}`);
  }
  return option;
};

export const normalizeDurationKey = (duration: string): keyof typeof AI_JUDGE_DURATION_BASE_SCORES | null => {
  const trimmed = duration.trim();
  if (Object.prototype.hasOwnProperty.call(AI_JUDGE_DURATION_BASE_SCORES, trimmed)) {
    return trimmed as keyof typeof AI_JUDGE_DURATION_BASE_SCORES;
  }
  return LEGACY_DURATION_KEY_MAP[trimmed] ?? null;
};

export const getDurationRule = (duration: string): RuleOption | null => {
  const normalized = normalizeDurationKey(duration);
  if (!normalized) return null;
  return DURATIONS.find((item) => item.key === normalized) ?? null;
};

export const findSensitiveTerms = (text: string): string[] => {
  const normalized = text.toLowerCase();
  return SENSITIVE_TERMS.filter((term) => normalized.includes(term.toLowerCase()));
};

export const analyzeContentSafety = (text: string): SafetyResult => {
  const sensitiveTerms = findSensitiveTerms(text);
  const warnings = SAFETY_PATTERNS.filter((item) => item.pattern.test(text)).map((item) => item.label);

  return {
    level: sensitiveTerms.length > 0 ? 'block' : warnings.length > 0 ? 'review' : 'pass',
    sensitiveTerms,
    warnings
  };
};

export const getOptionLabel = (options: readonly RuleOption[], key: string): string => {
  const direct = options.find((option) => option.key === key);
  if (direct) return direct.label;
  const normalizedDuration = normalizeDurationKey(key);
  if (normalizedDuration) {
    return DURATIONS.find((option) => option.key === normalizedDuration)?.label ?? normalizedDuration;
  }
  return key;
};

export const calculateScore = (input: Pick<RecordInput, 'duration'>): ScoreBreakdown => {
  const duration = requireOption(DURATIONS, input.duration, 'duration');
  const durationScore = duration.score ?? 0;
  const baseScore = durationScore;
  const durationBaseScore = durationScore;
  const durationMultiplier = 1;
  const riskMultiplier = 1;
  const disguiseBonus = 0;
  const creativityBonus = 0;

  return {
    baseScore,
    durationScore,
    durationBaseScore,
    durationMultiplier,
    riskMultiplier,
    disguiseBonus,
    creativityBonus,
    duration: duration.key,
    durationLabel: duration.label,
    fishPowerScore: Number(durationScore.toFixed(1)),
    scoreVersion: DURATION_SCORE_VERSION
  };
};

export const getTitleForTotalScore = (totalScore: number): string => {
  return TITLE_LEVELS.find((level) => totalScore >= level.min && totalScore <= level.max)?.title ?? '小鱼苗';
};

export const getTitleForDurationScore = (duration: string): string =>
  DURATION_SCORE_TITLES[normalizeDurationKey(duration) ?? duration] ?? '小憩鱼苗';

export const createSystemComment = (input: Pick<RecordInput, 'duration'>): string =>
  DURATION_SCORE_COMMENTS[normalizeDurationKey(input.duration) ?? input.duration] ?? '这条摸鱼记录已按持续时间入库。';
