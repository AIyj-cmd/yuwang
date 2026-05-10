export type TopicStatus = 'active' | 'hidden';

export type Topic = {
  id: number;
  name: string;
  slug: string;
  usage_count: number;
  status: TopicStatus;
  created_at: string;
  updated_at?: string;
};

export type RecordTopic = {
  id: number;
  record_id: number;
  topic_id: number;
  created_at: string;
};

export type TopicValidationResult =
  | { ok: true; name: string }
  | { ok: false; name: string; message: string };

export const MAX_TOPICS_PER_RECORD = 5;
export const MAX_CHINESE_TOPIC_LENGTH = 12;
export const MAX_MIXED_TOPIC_LENGTH = 24;

export const TOPIC_PRIVACY_MESSAGE = '这个话题可能包含真实身份、公司、客户或隐私信息，请换一个更匿名的说法。';

export const RECOMMENDED_TOPICS = [
  '今日精神状态',
  '会议摸鱼',
  '带薪学习',
  '工位哲学',
  '午休延长',
  '假装很忙',
  '灵魂离席',
  '外卖决策困难',
  '老板在附近',
  '静音保命'
] as const;

const BUILTIN_SENSITIVE_TOPIC_TERMS = [
  '公司名',
  '公司',
  '客户名',
  '客户',
  '部门名',
  '部门',
  '真实地址',
  '地址',
  '手机号',
  '手机',
  '电话',
  '身份证',
  '证件',
  '员工证',
  '工号',
  '微信号',
  '微信',
  '企微',
  '聊天记录',
  '截图',
  '客户资料',
  '公司机密',
  '商业秘密',
  '合同',
  '报价',
  '项目代号'
];

const TOPIC_PRIVACY_PATTERNS = [
  /1[3-9]\d{9}/,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\d{17}[\dXx]/,
  /https?:\/\/|www\./i,
  /\.(png|jpe?g|gif|webp|bmp|svg)$/i,
  /[\u4e00-\u9fffA-Za-z0-9]{2,}(有限公司|股份有限公司|科技有限公司|集团|银行|保险|律所|事务所)/,
  /[\u4e00-\u9fff]{2,}(省|市|区|县|镇|街道|路|号楼|大厦|园区|办公室)/,
  /\b(?:wx|wechat|weixin|qq)[-_:\s]?[A-Za-z0-9_-]{4,}\b/i,
  /\b[A-Z]{2,}[-_]?\d{3,}\b/
];

export const normalizeTopicName = (value: string): string =>
  value
    .replace(/^[#＃]+/, '')
    .trim()
    .replace(/\s+/g, ' ');

export const isChineseOnlyTopic = (name: string): boolean => /^[\u4e00-\u9fff]+$/.test(name);

export const createTopicSlug = (name: string): string => {
  const normalized = normalizeTopicName(name);
  const ascii = normalized
    .normalize('NFKD')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  if (ascii) return ascii;

  const encoded = Array.from(normalized)
    .map((char) => char.codePointAt(0)?.toString(36) ?? '')
    .filter(Boolean)
    .join('-')
    .slice(0, 96);

  return encoded ? `t-${encoded}` : `topic-${Date.now().toString(36)}`;
};

export const validateTopicName = (rawName: string, sensitiveTerms: readonly string[] = []): TopicValidationResult => {
  const name = normalizeTopicName(rawName);
  if (!name) return { ok: false, name, message: '话题不能为空。' };

  const chars = Array.from(name);
  const chineseOnly = isChineseOnlyTopic(name);
  const maxLength = chineseOnly ? MAX_CHINESE_TOPIC_LENGTH : MAX_MIXED_TOPIC_LENGTH;
  if (chars.length > maxLength) {
    return {
      ok: false,
      name,
      message: chineseOnly ? `中文话题最多 ${MAX_CHINESE_TOPIC_LENGTH} 个字。` : `英文或混合话题最多 ${MAX_MIXED_TOPIC_LENGTH} 个字符。`
    };
  }

  if (!/[\p{L}\p{N}\u4e00-\u9fff]/u.test(name)) {
    return { ok: false, name, message: '话题不能只有符号。' };
  }

  const normalized = name.toLowerCase();
  const sensitivePool = [...BUILTIN_SENSITIVE_TOPIC_TERMS, ...sensitiveTerms].map((term) => normalizeTopicName(String(term)).toLowerCase()).filter(Boolean);
  if (sensitivePool.some((term) => normalized.includes(term)) || TOPIC_PRIVACY_PATTERNS.some((pattern) => pattern.test(name))) {
    return { ok: false, name, message: TOPIC_PRIVACY_MESSAGE };
  }

  return { ok: true, name };
};

export const normalizeTopicList = (
  rawTopics: readonly string[],
  sensitiveTerms: readonly string[] = []
): { topics: string[]; error: string } => {
  const topics: string[] = [];
  const seen = new Set<string>();

  for (const rawTopic of rawTopics) {
    const validation = validateTopicName(rawTopic, sensitiveTerms);
    if (!validation.ok) return { topics: [], error: validation.message };
    const key = validation.name.toLocaleLowerCase('zh-CN');
    if (seen.has(key)) continue;
    seen.add(key);
    topics.push(validation.name);
  }

  if (topics.length > MAX_TOPICS_PER_RECORD) {
    return { topics: [], error: `每条记录最多添加 ${MAX_TOPICS_PER_RECORD} 个话题。` };
  }

  return { topics, error: '' };
};
