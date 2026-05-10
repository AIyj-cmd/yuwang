import { SLACKING_TYPE_OPTIONS } from './slackingTypes.js';

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

export type ScoreBreakdown = {
  baseScore: number;
  durationScore: number;
  durationBaseScore: number;
  durationMultiplier: number;
  riskMultiplier: number;
  disguiseBonus: number;
  creativityBonus: number;
  fishPowerScore: number;
  scoreVersion: string;
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
  { key: '0-10', id: '0_10', label: '0-10 分钟', score: 5, baseScore: 5 },
  { key: '10-30', id: '10_30', label: '10-30 分钟', score: 15, baseScore: 15 },
  { key: '30-60', id: '30_60', label: '30-60 分钟', score: 35, baseScore: 35 },
  { key: '1-2h', id: '1_2h', label: '1-2 小时', score: 70, baseScore: 70 },
  { key: '2-4h', id: '2_4h', label: '2-4 小时', score: 120, baseScore: 120 },
  { key: '4h-plus', id: '4h_plus', label: '超过 4 小时', score: 180, baseScore: 180 }
] as const satisfies readonly RuleOption[];

export const DURATIONS = DURATION_SCORE_RULES;

export const DURATION_SCORE_COMMENTS: Record<(typeof DURATION_SCORE_RULES)[number]['key'], string> = {
  '0-10': '只是短暂离开水面呼吸了一下。',
  '10-30': '这是一段合理但值得记录的精神游离。',
  '30-60': '你的灵魂已经离开工位一小段时间。',
  '1-2h': '半场失踪，但依然保持了表面稳定。',
  '2-4h': '工位还在，人类活动迹象减少。',
  '4h-plus': '今日鱼王候选，建议先确认自己还在上班。'
};

export const DURATION_SCORE_TITLES: Record<(typeof DURATION_SCORE_RULES)[number]['key'], string> = {
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
  const option = options.find((item) => item.key === key);
  if (!option) {
    throw new Error(`Invalid ${valueName}: ${key}`);
  }
  return option;
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
  return options.find((option) => option.key === key)?.label ?? key;
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
    fishPowerScore: Number(durationScore.toFixed(1)),
    scoreVersion: DURATION_SCORE_VERSION
  };
};

export const getTitleForTotalScore = (totalScore: number): string => {
  return TITLE_LEVELS.find((level) => totalScore >= level.min && totalScore <= level.max)?.title ?? '小鱼苗';
};

export const getTitleForDurationScore = (duration: string): string =>
  DURATION_SCORE_TITLES[duration as keyof typeof DURATION_SCORE_TITLES] ?? '小憩鱼苗';

export const createSystemComment = (input: Pick<RecordInput, 'duration'>): string =>
  DURATION_SCORE_COMMENTS[input.duration as keyof typeof DURATION_SCORE_COMMENTS] ?? '这条摸鱼记录已按持续时间入库。';
