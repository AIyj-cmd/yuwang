import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  BADGE_DEFINITIONS,
  CREATIVITY_LEVELS,
  DURATION_SCORE_RULES,
  DISGUISES,
  DURATIONS,
  MAX_ACTIVITY_TEXT_LENGTH,
  LEADERBOARD_TYPES,
  MAX_DESCRIPTION_LENGTH,
  RISKS,
  SENSITIVE_TERMS,
  SLACKING_TYPES,
  SINGLE_RECORD_FISH_POWER_SCORE_MAX,
  SUPPORTED_LOCALES,
  TITLE_LEVELS,
  analyzeContentSafety,
  calculateScore,
  clampSingleRecordFishPowerScore,
  createSystemComment,
  getDurationRule,
  getOptionLabel,
  getTitleForDurationScore,
  getTitleForTotalScore,
  type CreateRecordRequest,
  type LeaderboardType,
  type ScoreBreakdown
} from '../shared/scoring.js';
import { findSlackingTypeOption } from '../shared/slackingTypes.js';
import { createUser, getUserFromRequest, isMuted, publicUserById, requireAdmin, requireAuth, verifyUser, type AuthUser } from './auth.js';
import {
  FISH_SCALE_INSUFFICIENT_MESSAGE,
  checkAndCompleteGroupGoalsForRecord,
  createGuildEvent,
  createNotification,
  db,
  getCurrentGroupGoalProgress,
  getFishScaleWallet,
  getNicknameTotalScore,
  getPopularTopics,
  getRecordTodayRank,
  getRecordTopics,
  getUserTotalScore,
  grantInteractionFishScale,
  grantRecordSubmissionFishScale,
  hasFishScaleTransaction,
  insertRecord,
  listGuildEvents,
  listFishScaleTransactions,
  refreshAllSocialAggregates,
  refreshRecordInteractionCounts,
  runInTransaction,
  spendFishScale
} from './database.js';
import { CIRCLE_FEATURED_BOARDS, COMMENT_MAX_LENGTH, GROUP_CHALLENGES, GROUP_NAME_MAX_LENGTH, getGuildLevel } from '../shared/social.js';
import { MAX_TOPICS_PER_RECORD, TOPIC_PRIVACY_MESSAGE, normalizeTopicList, type Topic } from '../shared/topics.js';
import { getMonthRange, getSeasonRange, getTodayRange, getWeekRange, type PeriodRange } from './time.js';
import { registerAdminRoutes } from './adminRoutes.js';
import { scoreRecordWithAiJudge } from './ai/judgeService.js';
import { getSiteSettings } from './siteSettings.js';
import { AvatarUploadError, avatarPolicy, clearUserAvatar, uploadUserAvatar } from './avatar.js';
import { rateLimitRequest } from './rateLimit.js';

const optionKeys = (options: readonly { key: string }[]) => options.map((option) => option.key);

const createRecordSchema: z.ZodType<CreateRecordRequest> = z.object({
  nickname: z.string().trim().min(1).max(24).default('匿名鱼'),
  activityText: z.string().trim().min(2).max(MAX_ACTIVITY_TEXT_LENGTH).optional(),
  activity_text: z.string().trim().min(2).max(MAX_ACTIVITY_TEXT_LENGTH).optional(),
  slackingType: z.string().trim().max(MAX_ACTIVITY_TEXT_LENGTH).optional(),
  slackingTypeId: z.string().trim().max(MAX_ACTIVITY_TEXT_LENGTH).optional(),
  slackingTypeGroup: z.string().trim().max(40).optional(),
  duration: z.string().trim().min(1).max(40),
  risk: z.enum(optionKeys(RISKS) as [string, ...string[]]).optional(),
  disguise: z.enum(optionKeys(DISGUISES) as [string, ...string[]]).optional(),
  creativity: z.enum(optionKeys(CREATIVITY_LEVELS) as [string, ...string[]]).optional(),
  description: z.string().trim().max(MAX_DESCRIPTION_LENGTH).optional(),
  storyText: z.string().trim().max(MAX_DESCRIPTION_LENGTH).optional(),
  story_text: z.string().trim().max(MAX_DESCRIPTION_LENGTH).optional(),
  anonymized: z.boolean().optional(),
  anonymous_confirm: z.boolean().optional(),
  publish_scope: z.enum(['community', 'private', 'groups']).optional(),
  publishToCommunity: z.boolean().default(true),
  autoCircles: z.boolean().default(true),
  privateOnly: z.boolean().default(false),
  groupIds: z.array(z.number().int().positive()).default([]),
  topics: z.array(z.string().max(80)).max(20).default([])
}).refine((data) => Boolean((data.activityText ?? data.activity_text ?? data.slackingType ?? '').trim()), {
  message: '摸鱼事项不能为空。',
  path: ['activity_text']
}).refine((data) => Boolean((data.storyText ?? data.story_text ?? data.description ?? '').trim()), {
  message: '摸鱼故事不能为空。',
  path: ['story_text']
});

const leaderboardSchema = z.object({
  board: z.enum(optionKeys(LEADERBOARD_TYPES) as [LeaderboardType, ...LeaderboardType[]]).default('today'),
  keyword: z.string().trim().max(24).optional()
});

const authSchema = z.object({
  username: z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).max(72),
  displayName: z.string().trim().min(1).max(24).optional(),
  locale: z.enum(['zh-CN', 'en-US']).optional()
});

const loginSchema = authSchema.pick({ username: true, password: true });
const updateMeSchema = z.object({
  displayName: z.string().trim().min(1).max(24).optional(),
  bio: z.string().trim().max(120).optional(),
  locale: z.enum(['zh-CN', 'en-US']).optional()
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
const topicParamSchema = z.object({ slug: z.string().trim().min(1).max(140) });
const interactionSchema = z.object({
  action: z.enum(['like', 'favorite', 'vote']),
  active: z.boolean().default(true)
});
const commentSchema = z.object({ content: z.string().trim().min(2).max(COMMENT_MAX_LENGTH) });
const reportSchema = z.object({ reason: z.string().trim().min(2).max(120).default('疑似包含未匿名化信息') });
const shareCardActionSchema = z.object({
  action: z.enum(['generate', 'copy_text', 'share_link']).default('generate')
});
const feedSchema = z.object({
  filter: z.enum(['latest', 'hot', 'high', 'legendary']).default('latest')
});
const topicDetailQuerySchema = z.object({
  filter: z.enum(['latest', 'hot', 'high', 'legendary']).default('latest')
});
const searchQuerySchema = z.object({
  q: z.string().trim().max(60).default('')
});
const groupSchema = z.object({
  name: z.string().trim().min(2).max(GROUP_NAME_MAX_LENGTH),
  description: z.string().trim().max(120).default(''),
  visibility: z.enum(['public', 'invite']).default('public')
});
const guildSchema = z.object({
  name: z.string().trim().min(2).max(40),
  description: z.string().trim().max(180).default(''),
  icon: z.string().trim().min(1).max(4)
});

const isSqliteUniqueConstraintError = (error: unknown): boolean => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
  const message = error instanceof Error ? error.message : '';
  return code === 'SQLITE_CONSTRAINT_UNIQUE' || code === 'ERR_SQLITE_CONSTRAINT' || message.includes('UNIQUE constraint failed');
};

const usernameRateLimitSubject = (body: unknown): string | null => {
  if (!body || typeof body !== 'object' || !('username' in body)) return null;
  const username = (body as { username?: unknown }).username;
  return typeof username === 'string' ? username : null;
};
const guildPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(40).optional(),
    description: z.string().trim().max(180).optional(),
    icon: z.string().trim().min(1).max(4).optional()
  })
  .refine((data) => data.name !== undefined || data.description !== undefined || data.icon !== undefined, {
    message: '至少提供一个要修改的字段。'
  });
const walletTransactionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(30)
});
const notificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(50).default(20)
});
const groupChallengeSchema = z.object({
  challengeName: z.string().trim().min(1).max(80)
});
const inviteSchema = z.object({ inviteCode: z.string().trim().min(4).max(16) });
const shareGroupSchema = z.object({ recordId: z.number().int().positive() });
const suggestionSchema = z.object({
  category: z.enum(['feature', 'bug', 'content', 'other']).default('feature'),
  content: z.string().trim().min(5).max(300),
  contact: z.string().trim().max(60).default(''),
  nickname: z.string().trim().max(24).default('匿名鱼')
});
const checkinSchema = z.object({ note: z.string().trim().max(80).default('') });
const reviewSchema = z.object({
  status: z.enum(['approved', 'pending', 'rejected']),
  reviewNote: z.string().trim().max(160).default('')
});
const guildMemberParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive()
});

const announcements = [
  {
    id: 1,
    title: '社区系统已上线',
    body: '社区广场、工会大厅、圈子广场和我的小组已经接入。请继续匿名化你的精神状态，不要提交真实公司或客户信息。',
    level: 'feature',
    createdAt: '2026-05-09'
  },
  {
    id: 2,
    title: '排行榜改为用户聚合',
    body: '排行榜现在按用户或昵称汇总提交次数和累计指标，不再把每条记录逐条展开。',
    level: 'notice',
    createdAt: '2026-05-09'
  },
  {
    id: 3,
    title: '每日签到开放',
    body: '登录后可以在账号区签到，记录连续签到天数。签到只记录娱乐状态，不收集真实办公身份。',
    level: 'notice',
    createdAt: '2026-05-09'
  }
];

type LeaderboardRow = {
  id: number;
  rank: number;
  nickname: string;
  username?: string;
  score: number;
  metricLabel: string;
  title: string;
  description: string;
  slackingType: string;
  activityText: string;
  risk: string;
  createdAt: string;
  likeCount: number;
  favoriteCount: number;
  voteCount: number;
  commentCount: number;
  count?: number;
};

const normalizeNickname = (nickname: string): string => {
  const clean = nickname.trim().replace(/\s+/g, ' ');
  return clean || '匿名鱼';
};

const normalizeActivityText = (activityText: string): string => activityText.trim().replace(/\s+/g, ' ');

const getShanghaiDateKey = (date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);

const shiftDateKey = (dateKey: string, offsetDays: number): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return getShanghaiDateKey(new Date(Date.UTC(year, month - 1, day + offsetDays, 12)));
};

const getCheckinSummary = (userId: number) => {
  const today = getShanghaiDateKey();
  const latest = db
    .prepare('SELECT * FROM checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 1')
    .get(userId) as Record<string, unknown> | undefined;
  const total = db.prepare('SELECT COUNT(*) AS count FROM checkins WHERE user_id = ?').get(userId) as { count: number };
  const checkedToday = latest?.checkin_date === today;

  return {
    today,
    checkedToday,
    total: Number(total.count ?? 0),
    streak: latest ? Number(latest.streak ?? 0) : 0,
    lastDate: latest ? String(latest.checkin_date) : '',
    note: latest ? String(latest.note ?? '') : ''
  };
};

const approvedWhere = "slacking_records.status = 'approved'";

const resolveSlackingType = (record: Record<string, unknown>) => {
  const rawId = String(record.slacking_type_id ?? '');
  const rawValue = String(record.slacking_type ?? '');
  const option = findSlackingTypeOption(rawId) ?? findSlackingTypeOption(rawValue);
  return {
    id: option?.id ?? (rawId || rawValue),
    label: option?.label ?? rawValue,
    groupId: String(record.slacking_type_group ?? option?.groupId ?? '')
  };
};

const parseActivityTags = (value: unknown): string[] => {
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const publicTopic = (topic: Topic) => ({
  id: Number(topic.id),
  name: String(topic.name),
  slug: String(topic.slug),
  usage_count: Number(topic.usage_count ?? 0),
  status: String(topic.status ?? 'active'),
  created_at: String(topic.created_at),
  updated_at: topic.updated_at ? String(topic.updated_at) : undefined
});

const enabledSensitiveWords = (): string[] =>
  (
    db
      .prepare('SELECT word FROM sensitive_words WHERE enabled = 1')
      .all() as { word: string }[]
  ).map((row) => row.word);

const parseScoreBreakdown = (value: unknown): Partial<ScoreBreakdown> => {
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Partial<ScoreBreakdown>) : {};
  } catch {
    return {};
  }
};

const publicAuthUser = (user: AuthUser): AuthUser => ({
  ...user,
  isAdmin: false
});

const publicRecord = (record: Record<string, unknown>) => {
  const userId = record.user_id === null || record.user_id === undefined ? null : Number(record.user_id);
  const user = userId ? publicUserById(userId) : null;
  const slackingType = resolveSlackingType(record);
  const scoreVersion = String(record.score_version ?? 'legacy_type_v1');
  const baseScore = Number(record.base_score ?? 0);
  const durationMultiplier = Number(record.duration_multiplier ?? 1);
  const durationScore = Number(record.duration_score ?? 0);
  const durationBaseScore =
    durationScore ||
    Number(record.duration_base_score ?? 0) ||
    (scoreVersion === 'time_v2' || scoreVersion === 'duration_v3' ? baseScore : Number((baseScore * durationMultiplier).toFixed(1)));
  const activityText = normalizeActivityText(String(record.activity_text || slackingType.label));
  const storyText = String(record.story_text || record.description || '');
  const storedBreakdown = parseScoreBreakdown(record.score_breakdown);
  const durationLabel = storedBreakdown.durationLabel ?? getOptionLabel(DURATIONS, String(record.duration));
  const fishPowerScore = clampSingleRecordFishPowerScore(Number(record.fish_power_score ?? 0));

  return {
    id: Number(record.id),
    userId,
    username: user?.username ?? '',
    nickname: String(record.nickname),
    slackingType: slackingType.id,
    slackingTypeId: slackingType.id,
    slackingTypeGroup: slackingType.groupId,
    slackingTypeLabel: slackingType.label,
    activityText,
    activityTags: parseActivityTags(record.activity_tags),
    topics: getRecordTopics(Number(record.id)).map(publicTopic),
    duration: String(record.duration),
    durationLabel,
    risk: String(record.risk),
    riskLabel: getOptionLabel(RISKS, String(record.risk)),
    disguise: String(record.disguise),
    disguiseLabel: getOptionLabel(DISGUISES, String(record.disguise)),
    creativity: String(record.creativity),
    creativityLabel: getOptionLabel(CREATIVITY_LEVELS, String(record.creativity)),
    storyText,
    description: storyText,
    durationScore: durationScore || durationBaseScore,
    score: fishPowerScore,
    title: String(record.title),
    systemComment: String(record.system_comment),
    status: String(record.status ?? 'approved'),
    reviewNote: String(record.review_note ?? ''),
    visibility: String(record.visibility ?? 'public'),
    likeCount: Number(record.like_count ?? 0),
    favoriteCount: Number(record.favorite_count ?? 0),
    voteCount: Number(record.vote_count ?? 0),
    legendNominationCount: Number(record.legend_nomination_count ?? record.vote_count ?? 0),
    legendSelected: Boolean(record.legend_selected),
    reportCount: Number(record.report_count ?? 0),
    commentCount: Number(record.comment_count ?? 0),
    shareCount: Number(record.share_count ?? 0),
    guildId: record.guild_id === null || record.guild_id === undefined ? null : Number(record.guild_id),
    guildContribution: Number(record.guild_contribution ?? 0),
    scoreVersion,
    createdAt: String(record.created_at),
    breakdown: {
      baseScore,
      durationScore: durationScore || durationBaseScore,
      durationBaseScore,
      durationMultiplier,
      riskMultiplier: Number(record.risk_multiplier),
      disguiseBonus: Number(record.disguise_bonus),
      creativityBonus: Number(record.creativity_bonus),
      ...storedBreakdown,
      displayScore: fishPowerScore,
      fishPowerScore,
      singleRecordScoreMax: SINGLE_RECORD_FISH_POWER_SCORE_MAX
    }
  };
};

const mapRecordRows = (rows: Record<string, unknown>[], board: LeaderboardType): LeaderboardRow[] =>
  rows.map((row, index) => {
    const score = Number(row.score ?? 0);
    const disguiseBonus = Number(row.disguise_bonus ?? 0);
    const voteCount = Number(row.vote_count ?? 0);
    const count = Number(row.count ?? 0);

    return {
      id: Number(row.id ?? 0),
      rank: index + 1,
      nickname: String(row.nickname),
      username: row.username ? String(row.username) : undefined,
      score,
      metricLabel:
        board === 'legendary'
          ? `传奇提名 ${voteCount} · 提交 ${count} 条`
          : board === 'disguise'
            ? `伪装加分 ${disguiseBonus} · 提交 ${count} 条`
            : `累计 ${score.toFixed(1)} · 提交 ${count} 条`,
      title: String(row.title ?? getTitleForTotalScore(score)),
      description: String(row.description ?? ''),
      slackingType: resolveSlackingType(row).label,
      activityText: normalizeActivityText(String(row.activity_text || resolveSlackingType(row).label)),
      risk: getOptionLabel(RISKS, String(row.risk ?? '')),
      createdAt: String(row.created_at ?? ''),
      likeCount: Number(row.like_count ?? 0),
      favoriteCount: Number(row.favorite_count ?? 0),
      voteCount,
      commentCount: Number(row.comment_count ?? 0),
      count
    };
  });

const getAggregateLeaderboard = (board: LeaderboardType, range: PeriodRange | null, keyword: string): LeaderboardRow[] => {
  const like = `%${keyword}%`;
  const dateWhere = range ? 'AND slacking_records.created_at >= ? AND slacking_records.created_at < ?' : '';
  const meetingWhere =
    board === 'meeting'
      ? "AND (COALESCE(NULLIF(slacking_records.slacking_type_id, ''), slacking_records.slacking_type) IN ('meeting-pretend', 'fake-note-taking', 'camera-off-drift') OR slacking_records.risk IN ('meeting', 'screen-share') OR slacking_records.activity_text LIKE '%会议%' OR slacking_records.story_text LIKE '%会议%' OR slacking_records.description LIKE '%会议%')"
      : '';
  const orderBy =
    board === 'disguise'
      ? 'disguise_bonus DESC, score DESC, count DESC'
      : board === 'legendary'
        ? 'vote_count DESC, score DESC, count DESC'
        : 'score DESC, count DESC, nickname ASC';
  const params = range ? [range.start, range.end, keyword, like, like, like, like] : [keyword, like, like, like, like];
  const rows = db
    .prepare(
      `
        SELECT
          MAX(slacking_records.id) AS id,
          COALESCE(users.display_name, slacking_records.nickname) AS nickname,
          COALESCE(users.username, '') AS username,
          SUM(slacking_records.fish_power_score) AS score,
          COUNT(*) AS count,
          MAX(slacking_records.title) AS title,
          MAX(COALESCE(NULLIF(slacking_records.story_text, ''), slacking_records.description)) AS description,
          MAX(slacking_records.activity_text) AS activity_text,
          MAX(slacking_records.slacking_type) AS slacking_type,
          MAX(slacking_records.slacking_type_id) AS slacking_type_id,
          MAX(slacking_records.slacking_type_group) AS slacking_type_group,
          MAX(slacking_records.risk) AS risk,
          MAX(slacking_records.created_at) AS created_at,
          SUM(slacking_records.disguise_bonus) AS disguise_bonus,
          SUM(slacking_records.like_count) AS like_count,
          SUM(slacking_records.favorite_count) AS favorite_count,
          SUM(COALESCE(slacking_records.legend_nomination_count, slacking_records.vote_count, 0)) AS vote_count,
          SUM(slacking_records.comment_count) AS comment_count
        FROM slacking_records
        LEFT JOIN users ON users.id = slacking_records.user_id
        WHERE ${approvedWhere}
          ${dateWhere}
          ${meetingWhere}
          AND (? = '' OR slacking_records.nickname LIKE ? OR users.display_name LIKE ? OR users.username LIKE ? OR slacking_records.activity_text LIKE ?)
        GROUP BY COALESCE(CAST(slacking_records.user_id AS TEXT), slacking_records.nickname)
        ORDER BY ${orderBy}
        LIMIT 20
      `
    )
    .all(...params) as Record<string, unknown>[];
  return mapRecordRows(rows, board);
};

const getLeaderboardRows = (board: LeaderboardType, keyword = ''): LeaderboardRow[] => {
  if (board === 'today') return getAggregateLeaderboard(board, getTodayRange(), keyword);
  if (board === 'week') return getAggregateLeaderboard(board, getWeekRange(), keyword);
  if (board === 'month') return getAggregateLeaderboard(board, getMonthRange(), keyword);
  if (board === 'season') return getAggregateLeaderboard(board, getSeasonRange(), keyword);
  return getAggregateLeaderboard(board, null, keyword);
};

const communityFeatureFlags = {
  mutualFollowing: false,
  topics: false,
  profilePages: false
} as const;

const publicCommunityTopRow = (row: ReturnType<typeof getLeaderboardRows>[number]) => {
  const { username: _username, ...safeRow } = row;
  return safeRow;
};

const getViewerFlags = (recordId: number, userId?: number) => {
  if (!userId) return { liked: false, favorited: false, voted: false };
  const rows = db
    .prepare('SELECT action FROM record_interactions WHERE record_id = ? AND user_id = ?')
    .all(recordId, userId) as { action: string }[];
  const reactions = db
    .prepare("SELECT reaction_type FROM reactions WHERE target_type = 'record' AND target_id = ? AND user_id = ?")
    .all(recordId, userId) as { reaction_type: string }[];
  const actions = new Set(rows.map((row) => row.action));
  for (const reaction of reactions) {
    if (reaction.reaction_type === 'like') actions.add('like');
    if (reaction.reaction_type === 'legend') actions.add('vote');
  }
  return {
    liked: actions.has('like'),
    favorited: actions.has('favorite'),
    voted: actions.has('vote')
  };
};

const getRecordReactionFlags = (recordId: number, userId?: number) => {
  if (!userId) return { liked: false, favorited: false, legendNominated: false, reported: false };
  const interactions = db
    .prepare('SELECT action FROM record_interactions WHERE record_id = ? AND user_id = ?')
    .all(recordId, userId) as { action: string }[];
  const reactions = db
    .prepare("SELECT reaction_type FROM reactions WHERE target_type = 'record' AND target_id = ? AND user_id = ?")
    .all(recordId, userId) as { reaction_type: string }[];
  const report = db
    .prepare("SELECT id FROM reports WHERE target_type = 'record' AND target_id = ? AND user_id = ? AND status IN ('pending', 'reviewing') LIMIT 1")
    .get(recordId, userId);
  const actions = new Set(interactions.map((row) => row.action));
  const set = new Set(reactions.map((row) => row.reaction_type));
  return {
    liked: actions.has('like') || set.has('like'),
    favorited: actions.has('favorite'),
    legendNominated: actions.has('vote') || set.has('legend'),
    reported: Boolean(report)
  };
};

const getComments = (recordId: number, includePending = false) => {
  const rows = db
    .prepare(
      `
        SELECT comments.*, users.username
        FROM comments
        JOIN users ON users.id = comments.user_id
        WHERE comments.record_id = ?
          AND (${includePending ? '1 = 1' : "comments.status = 'approved'"})
        ORDER BY comments.created_at ASC
      `
    )
    .all(recordId) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: Number(row.id),
    recordId: Number(row.record_id),
    userId: Number(row.user_id),
    username: String(row.username),
    nickname: String(row.nickname),
    content: String(row.content),
    status: String(row.status),
    reviewNote: String(row.review_note ?? ''),
    createdAt: String(row.created_at)
  }));
};

const getSocialSummary = (recordId: number, userId?: number) => {
  const record = db.prepare('SELECT * FROM slacking_records WHERE id = ?').get(recordId) as Record<string, unknown> | undefined;
  if (!record) return null;
  return {
    record: publicRecord(record),
    viewer: getViewerFlags(recordId, userId),
    comments: getComments(recordId),
    shareCard: createShareCard(publicRecord(record))
  };
};

const recordTags = (record: ReturnType<typeof publicRecord>) => {
  const rows = db
    .prepare(
      `
        SELECT circles.id, circles.name, circles.slug
        FROM record_circles
        JOIN circles ON circles.id = record_circles.circle_id
        WHERE record_circles.record_id = ?
        ORDER BY circles.id ASC
      `
    )
    .all(record.id) as { id: number; name: string; slug: string }[];
  return rows;
};

const publicAvatarSeedForRecord = (recordId: number, nickname: string): string =>
  createHash('sha256').update(`community-record:${recordId}:${nickname}`).digest('hex').slice(0, 24);

const publicFeedRecord = (record: Record<string, unknown>, userId?: number) => {
  const mapped = publicRecord(record);
  const tags = recordTags(mapped);
  const guild =
    mapped.guildId === null
      ? null
      : (db.prepare('SELECT id, name, slug, icon FROM guilds WHERE id = ?').get(mapped.guildId) as
          | { id: number; name: string; slug: string; icon: string }
          | undefined);
  return {
    ...mapped,
    fishPowerScore: mapped.score,
    primaryTag: tags[0] ?? null,
    avatarSeed: publicAvatarSeedForRecord(mapped.id, mapped.nickname),
    avatarUrl: '',
    tags,
    guild: guild ?? null,
    viewer: getRecordReactionFlags(mapped.id, userId)
  };
};

const publicCommunityFeedRecord = (record: Record<string, unknown>, userId?: number) => ({
  ...publicFeedRecord(record, userId),
  userId: null,
  username: '',
  reviewNote: ''
});

const getCommunityMyStats = (user: AuthUser) => {
  const week = getWeekRange();
  const weekly = db
    .prepare(
      `
        SELECT COUNT(*) AS record_count, COALESCE(AVG(fish_power_score), 0) AS average_score
        FROM slacking_records
        WHERE user_id = ?
          AND status != 'rejected'
          AND created_at >= ?
          AND created_at < ?
      `
    )
    .get(user.id, week.start, week.end) as { record_count: number; average_score: number };
  const cumulativeScore = Number(getUserTotalScore(user.id).toFixed(1));
  const wallet = db.prepare('SELECT fish_scale_balance FROM user_wallets WHERE user_id = ?').get(user.id) as
    | { fish_scale_balance: number }
    | undefined;
  const higherRanked = db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM (
          SELECT user_id, COALESCE(SUM(fish_power_score), 0) AS total_score
          FROM slacking_records
          WHERE user_id IS NOT NULL
            AND status != 'rejected'
          GROUP BY user_id
          HAVING total_score > ?
        )
      `
    )
    .get(cumulativeScore) as { count: number };

  return {
    weeklyRecordCount: Number(weekly.record_count ?? 0),
    weeklyAverageScore: Number(Number(weekly.average_score ?? 0).toFixed(1)),
    cumulativeScore,
    fishScales: Number(wallet?.fish_scale_balance ?? 0),
    globalRank: cumulativeScore > 0 ? Number(higherRanked.count ?? 0) + 1 : null
  };
};

const getCommunitySiteToday = () => {
  const today = getTodayRange();
  const todayRecords = db
    .prepare(
      `
        SELECT
          COUNT(*) AS today_records,
          COUNT(DISTINCT COALESCE(CAST(user_id AS TEXT), 'anon:' || nickname)) AS today_active_users
        FROM slacking_records
        WHERE status = 'approved'
          AND visibility = 'public'
          AND created_at >= ?
          AND created_at < ?
      `
    )
    .get(today.start, today.end) as { today_records: number; today_active_users: number };
  const todayLikes = db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM record_interactions
        WHERE action = 'like'
          AND created_at >= ?
          AND created_at < ?
      `
    )
    .get(today.start, today.end) as { count: number };
  const totals = db
    .prepare(
      `
        SELECT
          COUNT(*) AS total_records,
          COALESCE(SUM(like_count), 0) AS total_likes
        FROM slacking_records
        WHERE status = 'approved'
          AND visibility = 'public'
      `
    )
    .get() as { total_records: number; total_likes: number };
  const totalUsers = db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number };

  return {
    todayRecords: Number(todayRecords.today_records ?? 0),
    todayActiveUsers: Number(todayRecords.today_active_users ?? 0),
    todayLikes: Number(todayLikes.count ?? 0),
    totalRecords: Number(totals.total_records ?? 0),
    totalUsers: Number(totalUsers.count ?? 0),
    totalLikes: Number(totals.total_likes ?? 0)
  };
};

const canViewRecord = (record: Record<string, unknown>, user?: { id: number; isAdmin?: boolean } | null): boolean => {
  const isPublic = String(record.status ?? 'approved') === 'approved' && String(record.visibility ?? 'public') === 'public';
  if (isPublic) return true;
  if (!user) return false;
  if (user.isAdmin) return true;
  return Number(record.user_id ?? 0) === user.id;
};

const getCommunityFeed = (filter: 'latest' | 'hot' | 'high' | 'legendary', userId?: number) => {
  const orderBy =
    filter === 'hot'
      ? '(like_count * 2 + comment_count * 3 + legend_nomination_count * 8) DESC, created_at DESC'
      : filter === 'high'
        ? 'fish_power_score DESC, created_at DESC'
        : filter === 'legendary'
          ? 'legend_selected DESC, legend_nomination_count DESC, vote_count DESC, fish_power_score DESC'
          : 'created_at DESC';
  const extra = filter === 'legendary' ? 'AND (legend_selected = 1 OR legend_nomination_count > 0 OR vote_count > 0 OR creativity = ?)' : '';
  const params = filter === 'legendary' ? ['legendary'] : [];
  const rows = db
    .prepare(
      `
        SELECT *
        FROM slacking_records
        WHERE status = 'approved'
          AND visibility = 'public'
          ${extra}
        ORDER BY ${orderBy}
        LIMIT 40
      `
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map((row) => publicCommunityFeedRecord(row, userId));
};

const getRecordAuthorId = (recordId: number): number | null => {
  const row = db.prepare('SELECT user_id FROM slacking_records WHERE id = ?').get(recordId) as { user_id: number | null } | undefined;
  return row?.user_id ? Number(row.user_id) : null;
};

const getUserDisplayLabel = (userId: number): string => {
  const row = db.prepare('SELECT display_name, username FROM users WHERE id = ?').get(userId) as
    | { display_name: string; username: string }
    | undefined;
  return row?.display_name || row?.username || '一位鱼友';
};

const awardRecordLikeFishScale = (recordId: number, actorUserId: number): void => {
  const authorId = getRecordAuthorId(recordId);
  if (!authorId || authorId === actorUserId) return;
  grantInteractionFishScale({
    userId: authorId,
    amount: 1,
    reason: 'record_liked',
    relatedType: `record_like:${actorUserId}`,
    relatedId: recordId
  });
  createNotification({
    userId: authorId,
    actorUserId,
    type: 'record_like',
    title: '你的摸鱼记录被点赞',
    body: `${getUserDisplayLabel(actorUserId)} 给你的匿名记录点了赞。`,
    targetType: 'record',
    targetId: recordId,
    dedupeKey: `record_like:${recordId}:${actorUserId}`
  });
};

const awardRecordCommentFishScale = (recordId: number, commentId: number, actorUserId: number): void => {
  const authorId = getRecordAuthorId(recordId);
  if (!authorId || authorId === actorUserId) return;
  const rewardKey = `record_comment:${actorUserId}`;
  grantInteractionFishScale({
    userId: authorId,
    amount: 2,
    reason: 'record_commented',
    relatedType: rewardKey,
    relatedId: recordId
  });
  createNotification({
    userId: authorId,
    actorUserId,
    type: 'record_comment',
    title: '你的摸鱼记录有新评论',
    body: `${getUserDisplayLabel(actorUserId)} 留下了一条评论，请继续保持匿名水域秩序。`,
    targetType: 'record',
    targetId: recordId,
    dedupeKey: `record_comment:${commentId}`
  });
};

const awardLegendNominationFishScale = (recordId: number, actorUserId: number): void => {
  const authorId = getRecordAuthorId(recordId);
  if (!authorId || authorId === actorUserId) return;
  grantInteractionFishScale({
    userId: authorId,
    amount: 10,
    reason: 'legend_nomination_received',
    relatedType: `record_legend:${actorUserId}`,
    relatedId: recordId
  });
  createNotification({
    userId: authorId,
    actorUserId,
    type: 'record_legend',
    title: '你的记录被传奇提名',
    body: `${getUserDisplayLabel(actorUserId)} 把这条摸鱼样本推进了传奇观察区。`,
    targetType: 'record',
    targetId: recordId,
    dedupeKey: `record_legend:${recordId}:${actorUserId}`
  });
};

const spendLegendNominationFishScale = (recordId: number, userId: number): void => {
  const spent = hasFishScaleTransaction({
    userId,
    type: 'spend',
    reason: 'legend_nomination_spend',
    relatedType: 'record',
    relatedId: recordId
  });
  if (!spent) {
    spendFishScale({
      userId,
      amount: 10,
      reason: 'legend_nomination_spend',
      relatedType: 'record',
      relatedId: recordId
    });
  }
};

const syncRecordReaction = (recordId: number, userId: number, reactionType: 'like' | 'legend'): { active: boolean; created: boolean } => {
  return runInTransaction(() => {
    const interactionAction = reactionType === 'legend' ? 'vote' : 'like';
    const existingReaction = db
      .prepare("SELECT id FROM reactions WHERE target_type = 'record' AND target_id = ? AND user_id = ? AND reaction_type = ?")
      .get(recordId, userId, reactionType);
    const existingInteraction = db
      .prepare('SELECT id FROM record_interactions WHERE record_id = ? AND user_id = ? AND action = ?')
      .get(recordId, userId, interactionAction);
    if (existingReaction || existingInteraction) {
      db.prepare("DELETE FROM reactions WHERE target_type = 'record' AND target_id = ? AND user_id = ? AND reaction_type = ?").run(
        recordId,
        userId,
        reactionType
      );
      db.prepare('DELETE FROM record_interactions WHERE record_id = ? AND user_id = ? AND action = ?').run(recordId, userId, interactionAction);
      refreshRecordInteractionCounts(recordId);
      return { active: false, created: false };
    }

    if (reactionType === 'legend') spendLegendNominationFishScale(recordId, userId);
    const now = new Date().toISOString();
    db.prepare('INSERT OR IGNORE INTO reactions (target_type, target_id, user_id, reaction_type, created_at) VALUES (?, ?, ?, ?, ?)').run(
      'record',
      recordId,
      userId,
      reactionType,
      now
    );
    db.prepare('INSERT OR IGNORE INTO record_interactions (record_id, user_id, action, created_at) VALUES (?, ?, ?, ?)').run(
      recordId,
      userId,
      interactionAction,
      now
    );
    if (reactionType === 'like') awardRecordLikeFishScale(recordId, userId);
    if (reactionType === 'legend') awardLegendNominationFishScale(recordId, userId);
    refreshRecordInteractionCounts(recordId);
    return { active: true, created: true };
  });
};

const userGroupIds = (userId: number, ids: number[]): number[] => {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT group_id FROM group_members WHERE user_id = ? AND group_id IN (${placeholders})`)
    .all(userId, ...ids) as { group_id: number }[];
  return rows.map((row) => row.group_id);
};

const publicGuild = (row: Record<string, unknown>, userId?: number) => {
  const id = Number(row.id);
  const member = userId
    ? (db.prepare('SELECT role FROM guild_members WHERE guild_id = ? AND user_id = ?').get(id, userId) as { role: string } | undefined)
    : undefined;
  return {
    id,
    name: String(row.name),
    slug: String(row.slug),
    description: String(row.description),
    icon: String(row.icon),
    ownerUserId: row.owner_user_id === null || row.owner_user_id === undefined ? null : Number(row.owner_user_id),
    createdByUserId: row.created_by_user_id === null || row.created_by_user_id === undefined ? null : Number(row.created_by_user_id),
    source: String(row.source ?? 'official'),
    joinPolicy: String(row.join_policy ?? 'open'),
    status: String(row.status ?? 'active'),
    totalContribution: Number(row.total_contribution ?? 0),
    memberCount: Number(row.member_count ?? 0),
    level: getGuildLevel(Number(row.total_contribution ?? 0)),
    joined: Boolean(member),
    role: member?.role ?? ''
  };
};

const publicCircle = (row: Record<string, unknown>, userId?: number) => {
  const id = Number(row.id);
  const member = userId ? db.prepare('SELECT id FROM circle_members WHERE circle_id = ? AND user_id = ?').get(id, userId) : null;
  return {
    id,
    name: String(row.name),
    slug: String(row.slug),
    description: String(row.description),
    icon: String(row.icon),
    memberCount: Number(row.member_count ?? 0),
    recordCount: Number(row.record_count ?? 0),
    joined: Boolean(member),
    boards: CIRCLE_FEATURED_BOARDS[String(row.slug)] ?? []
  };
};

const publicGroup = (row: Record<string, unknown>, userId?: number) => {
  const id = Number(row.id);
  const member = userId
    ? (db.prepare('SELECT role, nickname_title FROM group_members WHERE group_id = ? AND user_id = ?').get(id, userId) as
        | { role: string; nickname_title: string }
        | undefined)
    : undefined;
  return {
    id,
    name: String(row.name),
    description: String(row.description ?? ''),
    visibility: String(row.visibility),
    inviteCode: member ? String(row.invite_code) : '',
    ownerUserId: Number(row.owner_user_id),
    memberCount: Number(row.member_count ?? 0),
    joined: Boolean(member),
    role: member?.role ?? '',
    nicknameTitle: member?.nickname_title ?? '',
    createdAt: String(row.created_at)
  };
};

const publicGroupGoalProgress = (progress: ReturnType<typeof getCurrentGroupGoalProgress>) => ({
  goal: {
    id: progress.goal.id,
    groupId: progress.goal.group_id,
    goalType: progress.goal.goal_type,
    targetValue: progress.goal.target_value,
    periodKey: progress.goal.period_key,
    status: progress.goal.status,
    rewardTitle: progress.goal.reward_title,
    createdAt: progress.goal.created_at,
    completedAt: progress.goal.completed_at
  },
  period: progress.period,
  currentValue: progress.currentValue,
  targetValue: progress.targetValue,
  percent: progress.percent,
  completed: progress.completed,
  contributions: progress.contributions
});

const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (item) => `\\${item}`);

const publicSearchUser = (row: Record<string, unknown>) => ({
  id: Number(row.id),
  username: String(row.username),
  displayName: String(row.display_name),
  bio: String(row.bio ?? ''),
  avatarSeed: String(row.avatar_seed ?? ''),
  avatarUrl: String(row.avatar_url ?? ''),
  totalScore: Number(row.total_score ?? 0),
  title: getTitleForTotalScore(Number(row.total_score ?? 0))
});

const getTopicOrderBy = (filter: 'latest' | 'hot' | 'high' | 'legendary'): string => {
  if (filter === 'hot') return '(slacking_records.like_count * 2 + slacking_records.comment_count * 3 + slacking_records.legend_nomination_count * 8) DESC, slacking_records.created_at DESC';
  if (filter === 'high') return 'slacking_records.fish_power_score DESC, slacking_records.created_at DESC';
  if (filter === 'legendary') return 'slacking_records.legend_selected DESC, slacking_records.legend_nomination_count DESC, slacking_records.vote_count DESC, slacking_records.created_at DESC';
  return 'slacking_records.created_at DESC';
};

const emptySearchResults = (query = '') => ({
  query,
  records: [],
  topics: [],
  users: [],
  guilds: [],
  circles: [],
  groups: []
});

const randomInviteCode = (): string => Math.random().toString(36).slice(2, 8).toUpperCase();

const uniqueUserGuildSlug = (): string => {
  let slug = `user-guild-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  while (db.prepare('SELECT id FROM guilds WHERE slug = ?').get(slug)) {
    slug = `user-guild-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }
  return slug;
};

const createShareCard = (record: ReturnType<typeof publicRecord>) => {
  const settings = getSiteSettings();
  const today = getTodayRange();
  const isToday = record.createdAt >= today.start && record.createdAt < today.end;
  const todayRank = isToday ? getRecordTodayRank({ created_at: record.createdAt, fish_power_score: record.score }, today) : null;
  const topicTags = record.topics.map((topic) => topic.name).slice(0, 4);
  const dateLabel = record.createdAt ? record.createdAt.slice(0, 10) : '';
  const rankLabel = isToday && todayRank ? `今日第 ${todayRank} 名` : `历史高光 · ${dateLabel}`;
  const historicalHighlight =
    isToday && todayRank
      ? '今日排名会随当天新记录变化'
      : record.legendNominationCount > 0
        ? `历史记录 · 获得 ${record.legendNominationCount} 次传奇提名`
        : `历史记录 · 当时得分 ${record.score.toFixed(1)}`;
  const topicLine = topicTags.length ? `#${topicTags.join(' #')}` : '匿名摸鱼样本';
  const shareText = `我在工位鱼王拿到 ${record.score.toFixed(1)} Fish Power Score，称号「${record.title}」。${rankLabel}，${topicLine}。${record.systemComment} 本平台仅供娱乐，请勿提交真实隐私或公司机密。`;

  return {
    recordId: record.id,
    title: `${record.nickname} 获得 ${record.score.toFixed(1)} Fish Power Score`,
    subtitle: `${record.title} · ${record.activityText}`,
    body: record.systemComment,
    shareText,
    score: record.score,
    titleLevel: record.title,
    systemComment: record.systemComment,
    todayRank,
    isToday,
    rankLabel,
    rankIsRealtime: isToday,
    historicalHighlight,
    createdAt: record.createdAt,
    topicTags,
    safetyNotice: settings.safetyNotice,
    shareCount: record.shareCount
  };
};

const getBadgesForUser = (userId: number) => {
  const stats = db
    .prepare(
      `
        SELECT
          COUNT(*) AS record_count,
          COALESCE(MAX(fish_power_score), 0) AS top_score,
          SUM(CASE WHEN COALESCE(NULLIF(slacking_type_id, ''), slacking_type) IN ('meeting-pretend', 'fake-note-taking', 'camera-off-drift') OR risk IN ('meeting', 'screen-share') OR activity_text LIKE '%会议%' OR story_text LIKE '%会议%' OR description LIKE '%会议%' THEN 1 ELSE 0 END) AS meeting_count,
          COALESCE(MAX(disguise_bonus), 0) AS max_disguise
        FROM slacking_records
        WHERE user_id = ?
          AND status != 'rejected'
      `
    )
    .get(userId) as { record_count: number; top_score: number; meeting_count: number; max_disguise: number };
  const votes = db.prepare("SELECT COUNT(*) AS count FROM record_interactions WHERE user_id = ? AND action = 'vote'").get(userId) as {
    count: number;
  };
  const comments = db.prepare("SELECT COUNT(*) AS count FROM comments WHERE user_id = ? AND status = 'approved'").get(userId) as {
    count: number;
  };

  const unlocked = new Set<string>();
  if (stats.record_count > 0) unlocked.add('first-catch');
  if (stats.top_score >= 8) unlocked.add('power-200');
  if (stats.top_score >= 10) unlocked.add('power-500');
  if (stats.meeting_count > 0) unlocked.add('meeting-fish');
  if (stats.max_disguise >= 30) unlocked.add('disguise-master');
  if (votes.count > 0) unlocked.add('legend-voter');
  if (comments.count > 0) unlocked.add('social-fish');

  return BADGE_DEFINITIONS.map((badge) => ({
    ...badge,
    unlocked: unlocked.has(badge.key)
  }));
};

const getPublicUserScore = (userId: number): number => {
  const row = db
    .prepare("SELECT COALESCE(SUM(fish_power_score), 0) AS total FROM slacking_records WHERE user_id = ? AND status = 'approved' AND visibility = 'public'")
    .get(userId) as { total: number };
  return Number(row.total ?? 0);
};

const getPersonaForInsights = (input: {
  totalRecords: number;
  topTypeKey: string;
  topDisguiseKey: string;
  comments: number;
  legendNominations: number;
}) => {
  if (input.topTypeKey.includes('meeting')) {
    return {
      key: 'meeting-ghost',
      label: '会议幽灵',
      description: '常在会议水域低速漂移，表情稳定，灵魂轻微离席。'
    };
  }
  if (input.topDisguiseKey.includes('excel')) {
    return {
      key: 'excel-meditator',
      label: 'Excel 冥想师',
      description: '擅长把精神放空伪装成表格研究，单元格里自有潮汐。'
    };
  }
  if (input.legendNominations > 0) {
    return {
      key: 'desk-stealth-mage',
      label: '工位隐身术士',
      description: '记录已经被传奇观察区盯上，隐身术带一点节目效果。'
    };
  }
  if (input.comments > 0) {
    return {
      key: 'tea-room-strategist',
      label: '茶水间战略家',
      description: '不只自己漂，还能在评论区留下稳定水纹。'
    };
  }
  if (input.totalRecords === 0) {
    return {
      key: 'new-fry',
      label: '浅水观察员',
      description: '画像还在空白水域，提交公开记录后会开始成形。'
    };
  }
  return {
    key: 'document-diver',
    label: '文档潜水员',
    description: '在文档、需求和精神游离之间保持低调呼吸。'
  };
};

export const registerRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/api/health', async () => ({ ok: true }));

  app.get('/api/options', async () => {
    const settings = getSiteSettings();
    return {
      slackingTypes: SLACKING_TYPES,
      durations: DURATIONS,
      durationScoreRules: DURATION_SCORE_RULES,
      risks: RISKS,
      disguises: DISGUISES,
      creativityLevels: CREATIVITY_LEVELS,
      leaderboardTypes: LEADERBOARD_TYPES,
      titleLevels: TITLE_LEVELS,
      sensitiveTerms: SENSITIVE_TERMS,
      maxActivityTextLength: MAX_ACTIVITY_TEXT_LENGTH,
      maxDescriptionLength: MAX_DESCRIPTION_LENGTH,
      safetyNotice: settings.safetyNotice,
      badges: BADGE_DEFINITIONS,
      supportedLocales: SUPPORTED_LOCALES
    };
  });

  app.post('/api/auth/register', async (request, reply) => {
    if (!rateLimitRequest(request, reply, { bucket: 'auth-register', max: 8, windowMs: 60_000, subject: usernameRateLimitSubject(request.body) })) return;
    const parsed = authSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: '注册信息无效。' });

    try {
      const result = createUser({
        username: parsed.data.username,
        password: parsed.data.password,
        displayName: parsed.data.displayName ?? parsed.data.username,
        locale: parsed.data.locale
      });
      getFishScaleWallet(result.user.id);
      return reply.code(201).send({ ...result, user: publicAuthUser(result.user) });
    } catch (error) {
      if (isSqliteUniqueConstraintError(error)) {
        return reply.code(409).send({ message: '用户名已存在。' });
      }
      request.log.error({ error }, 'failed to register user');
      return reply.code(500).send({ message: '注册失败，请稍后再试。' });
    }
  });

  app.post('/api/auth/login', async (request, reply) => {
    if (!rateLimitRequest(request, reply, { bucket: 'auth-login', max: 12, windowMs: 60_000, subject: usernameRateLimitSubject(request.body) })) return;
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: '登录信息无效。' });
    const result = verifyUser(parsed.data.username, parsed.data.password);
    if (!result) return reply.code(401).send({ message: '用户名或密码不正确。' });
    return { ...result, user: publicAuthUser(result.user) };
  });

  app.get('/api/auth/me', async (request) => {
    const user = getUserFromRequest(request);
    return { user: user ? publicAuthUser(user) : null, badges: user ? getBadgesForUser(user.id) : [] };
  });

  app.get('/api/auth/me/avatar-policy', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    return avatarPolicy();
  });

  app.post('/api/auth/me/avatar', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;

    try {
      const uploaded = await uploadUserAvatar(user.id, request);
      return {
        user: publicUserById(user.id),
        avatarUrl: uploaded.avatarUrl
      };
    } catch (error) {
      if (error instanceof AvatarUploadError) {
        return reply.code(error.statusCode).send({ message: error.message, reason: error.reason });
      }
      throw error;
    }
  });

  app.delete('/api/auth/me/avatar', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;

    const removed = clearUserAvatar({
      userId: user.id,
      action: 'remove',
      avatarStatus: 'removed',
      actorType: 'user',
      actorId: user.id,
      reason: 'user_removed'
    });
    if (!removed) return reply.code(404).send({ message: 'User not found.' });
    return { user: publicUserById(user.id) };
  });

  app.get('/api/wallet/me', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const recent = listFishScaleTransactions({ userId: user.id, page: 1, pageSize: 8 });
    return {
      wallet: getFishScaleWallet(user.id),
      recentTransactions: recent.transactions,
      notice: '鱼鳞是站内娱乐积分，不可提现、不可交易、不可转让，也不是链上代币。'
    };
  });

  app.get('/api/wallet/transactions', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const parsed = walletTransactionsSchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: '鱼鳞流水参数无效。' });
    return listFishScaleTransactions({ userId: user.id, page: parsed.data.page, pageSize: parsed.data.page_size });
  });

  app.get('/api/notifications', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const parsed = notificationsQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: '通知参数无效。' });
    const page = parsed.data.page;
    const pageSize = parsed.data.page_size;
    const rows = db
      .prepare(
        `
          SELECT *
          FROM notifications
          WHERE user_id = ?
          ORDER BY created_at DESC, id DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(user.id, pageSize, (page - 1) * pageSize) as Record<string, unknown>[];
    const total = Number((db.prepare('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?').get(user.id) as { count: number }).count ?? 0);
    return {
      notifications: rows.map((row) => ({
        id: Number(row.id),
        userId: Number(row.user_id),
        type: String(row.type),
        title: String(row.title),
        body: String(row.body ?? ''),
        targetType: String(row.target_type ?? ''),
        targetId: row.target_id === null || row.target_id === undefined ? null : Number(row.target_id),
        dedupeKey: String(row.dedupe_key ?? ''),
        isRead: Boolean(row.is_read),
        createdAt: String(row.created_at),
        readAt: String(row.read_at ?? '')
      })),
      total,
      page,
      pageSize
    };
  });

  app.get('/api/notifications/unread-count', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const row = db.prepare('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0').get(user.id) as { count: number };
    return { count: Number(row.count ?? 0) };
  });

  app.post('/api/notifications/:id/read', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '通知 ID 无效。' });
    const now = new Date().toISOString();
    db.prepare("UPDATE notifications SET is_read = 1, read_at = CASE WHEN read_at = '' THEN ? ELSE read_at END WHERE id = ? AND user_id = ?").run(
      now,
      params.data.id,
      user.id
    );
    return { ok: true };
  });

  app.post('/api/notifications/read-all', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const now = new Date().toISOString();
    db.prepare("UPDATE notifications SET is_read = 1, read_at = CASE WHEN read_at = '' THEN ? ELSE read_at END WHERE user_id = ? AND is_read = 0").run(
      now,
      user.id
    );
    return { ok: true };
  });

  app.patch('/api/auth/me', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const parsed = updateMeSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: '资料格式无效。' });

    const displayName = parsed.data.displayName ?? user.displayName;
    const bio = parsed.data.bio ?? user.bio;
    const locale = parsed.data.locale ?? user.locale;
    db.prepare('UPDATE users SET display_name = ?, bio = ?, locale = ?, updated_at = ? WHERE id = ?').run(
      displayName,
      bio,
      locale,
      new Date().toISOString(),
      user.id
    );
    return { user: publicUserById(user.id), badges: getBadgesForUser(user.id) };
  });

  app.get('/api/users/:username/insights', async (request, reply) => {
    const username = String((request.params as { username: string }).username);
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as Record<string, unknown> | undefined;
    if (!row) return reply.code(404).send({ message: '用户不存在。' });
    const userId = Number(row.id);
    const baseWhere = "user_id = ? AND status = 'approved' AND visibility = 'public'";
    const summary = db
      .prepare(
        `
          SELECT
            COUNT(*) AS total_records,
            COALESCE(SUM(fish_power_score), 0) AS total_score,
            COALESCE(AVG(fish_power_score), 0) AS average_score,
            COALESCE(SUM(like_count), 0) AS likes,
            COALESCE(SUM(comment_count), 0) AS comments,
            COALESCE(SUM(legend_nomination_count), 0) AS legend_nominations
          FROM slacking_records
          WHERE ${baseWhere}
        `
      )
      .get(userId) as {
        total_records: number;
        total_score: number;
        average_score: number;
        likes: number;
        comments: number;
        legend_nominations: number;
      };
    const topType = db
      .prepare(
        `
          SELECT COALESCE(NULLIF(slacking_type_id, ''), slacking_type) AS key, COUNT(*) AS count
          FROM slacking_records
          WHERE ${baseWhere}
          GROUP BY COALESCE(NULLIF(slacking_type_id, ''), slacking_type)
          ORDER BY count DESC, key ASC
          LIMIT 1
        `
      )
      .get(userId) as { key: string; count: number } | undefined;
    const topDisguise = db
      .prepare(
        `
          SELECT disguise AS key, COUNT(*) AS count
          FROM slacking_records
          WHERE ${baseWhere}
          GROUP BY disguise
          ORDER BY count DESC, key ASC
          LIMIT 1
        `
      )
      .get(userId) as { key: string; count: number } | undefined;
    const highest = db
      .prepare(`SELECT * FROM slacking_records WHERE ${baseWhere} ORDER BY fish_power_score DESC, created_at DESC LIMIT 1`)
      .get(userId) as Record<string, unknown> | undefined;
    const week = getWeekRange();
    const month = getMonthRange();
    const periodStats = (range: PeriodRange) =>
      db
        .prepare(
          `
            SELECT COUNT(*) AS records, COALESCE(SUM(fish_power_score), 0) AS score
            FROM slacking_records
            WHERE ${baseWhere}
              AND created_at >= ?
              AND created_at < ?
          `
        )
        .get(userId, range.start, range.end) as { records: number; score: number };
    const weekActivity = periodStats(week);
    const monthActivity = periodStats(month);
    const topTypeOption = topType ? findSlackingTypeOption(topType.key) : null;
    const persona = getPersonaForInsights({
      totalRecords: Number(summary.total_records ?? 0),
      topTypeKey: topType?.key ?? '',
      topDisguiseKey: topDisguise?.key ?? '',
      comments: Number(summary.comments ?? 0),
      legendNominations: Number(summary.legend_nominations ?? 0)
    });

    return {
      insights: {
        username: String(row.username),
        displayName: String(row.display_name),
        totalRecords: Number(summary.total_records ?? 0),
        totalScore: Number(Number(summary.total_score ?? 0).toFixed(1)),
        averageScore: Number(Number(summary.average_score ?? 0).toFixed(1)),
        topSlackingType: topType
          ? {
              key: String(topType.key),
              label: topTypeOption?.label ?? String(topType.key),
              count: Number(topType.count ?? 0)
            }
          : null,
        topDisguise: topDisguise
          ? {
              key: String(topDisguise.key),
              label: getOptionLabel(DISGUISES, String(topDisguise.key)),
              count: Number(topDisguise.count ?? 0)
            }
          : null,
        highestRecord: highest ? publicRecord(highest) : null,
        weekActivity: {
          records: Number(weekActivity.records ?? 0),
          score: Number(Number(weekActivity.score ?? 0).toFixed(1))
        },
        monthActivity: {
          records: Number(monthActivity.records ?? 0),
          score: Number(Number(monthActivity.score ?? 0).toFixed(1))
        },
        interactions: {
          likes: Number(summary.likes ?? 0),
          comments: Number(summary.comments ?? 0),
          legendNominations: Number(summary.legend_nominations ?? 0)
        },
        persona
      }
    };
  });

  app.get('/api/users/:username', async (request, reply) => {
    const username = String((request.params as { username: string }).username);
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as Record<string, unknown> | undefined;
    if (!row) return reply.code(404).send({ message: '用户不存在。' });
    const userId = Number(row.id);
    const records = db
      .prepare("SELECT * FROM slacking_records WHERE user_id = ? AND status = 'approved' AND visibility = 'public' ORDER BY created_at DESC LIMIT 10")
      .all(userId) as Record<string, unknown>[];
    return {
      user: publicUserById(userId),
      totalScore: Number(getPublicUserScore(userId).toFixed(1)),
      badges: getBadgesForUser(userId),
      records: records.map(publicRecord)
    };
  });

  app.get('/api/stats', async () => {
    const row = db
      .prepare(
        `
          SELECT
            COUNT(*) AS total_records,
            COALESCE(SUM(fish_power_score), 0) AS total_score,
            COALESCE(MAX(fish_power_score), 0) AS top_score
          FROM slacking_records
          WHERE status = 'approved'
        `
      )
      .get() as { total_records: number; total_score: number; top_score: number };

    const today = getTodayRange();
    const todayRow = db
      .prepare("SELECT COUNT(*) AS today_records FROM slacking_records WHERE status = 'approved' AND created_at >= ? AND created_at < ?")
      .get(today.start, today.end) as { today_records: number };

    return {
      totalRecords: Number(row.total_records ?? 0),
      totalScore: Number(row.total_score ?? 0).toFixed(1),
      topScore: Number(row.top_score ?? 0).toFixed(1),
      todayRecords: Number(todayRow.today_records ?? 0)
    };
  });

  app.get('/api/announcements', async () => ({ announcements }));

  app.post('/api/suggestions', async (request, reply) => {
    const parsed = suggestionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: '建议内容格式无效。' });

    const user = getUserFromRequest(request);
    const safety = analyzeContentSafety(`${parsed.data.content} ${parsed.data.contact}`);
    if (safety.level === 'block') {
      return reply.code(400).send({ message: '建议疑似包含敏感信息，请先匿名化后再提交。', safety });
    }

    const result = db
      .prepare(
        `
          INSERT INTO suggestions (user_id, nickname, category, content, contact, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        user?.id ?? null,
        user?.displayName ?? normalizeNickname(parsed.data.nickname),
        parsed.data.category,
        parsed.data.content,
        parsed.data.contact,
        safety.level === 'review' ? 'pending' : 'open',
        new Date().toISOString()
      );

    return reply.code(201).send({
      id: Number(result.lastInsertRowid),
      status: safety.level === 'review' ? 'pending' : 'open',
      safety
    });
  });

  app.get('/api/checkins/me', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    return getCheckinSummary(user.id);
  });

  app.post('/api/checkins', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const parsed = checkinSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: '签到备注格式无效。' });

    const today = getShanghaiDateKey();
    const existing = db.prepare('SELECT id FROM checkins WHERE user_id = ? AND checkin_date = ?').get(user.id, today);
    if (existing) {
      return { ...getCheckinSummary(user.id), alreadyChecked: true };
    }

    const yesterday = shiftDateKey(today, -1);
    const previous = db
      .prepare('SELECT streak FROM checkins WHERE user_id = ? AND checkin_date = ?')
      .get(user.id, yesterday) as { streak: number } | undefined;
    const streak = previous ? Number(previous.streak ?? 0) + 1 : 1;

    db.prepare('INSERT INTO checkins (user_id, checkin_date, streak, note, created_at) VALUES (?, ?, ?, ?, ?)').run(
      user.id,
      today,
      streak,
      parsed.data.note,
      new Date().toISOString()
    );

    return { ...getCheckinSummary(user.id), alreadyChecked: false };
  });

  app.get('/api/leaderboards', async (request, reply) => {
    const parsed = leaderboardSchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: '排行榜参数无效。' });

    const board = parsed.data.board;
    return {
      board,
      label: LEADERBOARD_TYPES.find((item) => item.key === board)?.label ?? '排行榜',
      rows: getLeaderboardRows(board, parsed.data.keyword ?? '')
    };
  });

  app.get('/api/topics/popular', async () => ({
    topics: getPopularTopics(12).map(publicTopic)
  }));

  app.get('/api/search', async (request, reply) => {
    const parsed = searchQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: '搜索参数无效。' });
    const query = parsed.data.q.trim();
    if (query.length < 1) return emptySearchResults('');

    const user = getUserFromRequest(request);
    const like = `%${escapeLike(query)}%`;
    const records = db
      .prepare(
        `
          SELECT slacking_records.*
          FROM slacking_records
          LEFT JOIN users ON users.id = slacking_records.user_id
          WHERE slacking_records.status = 'approved'
            AND slacking_records.visibility = 'public'
            AND (
              slacking_records.title LIKE ? ESCAPE '\\'
              OR slacking_records.activity_text LIKE ? ESCAPE '\\'
              OR slacking_records.story_text LIKE ? ESCAPE '\\'
              OR slacking_records.description LIKE ? ESCAPE '\\'
              OR slacking_records.nickname LIKE ? ESCAPE '\\'
              OR users.username LIKE ? ESCAPE '\\'
              OR users.display_name LIKE ? ESCAPE '\\'
              OR EXISTS (
                SELECT 1
                FROM record_topics
                JOIN topics ON topics.id = record_topics.topic_id
                WHERE record_topics.record_id = slacking_records.id
                  AND topics.status = 'active'
                  AND topics.name LIKE ? ESCAPE '\\'
              )
            )
          ORDER BY slacking_records.created_at DESC
          LIMIT 6
        `
      )
      .all(like, like, like, like, like, like, like, like) as Record<string, unknown>[];

    const topics = db
      .prepare("SELECT * FROM topics WHERE status = 'active' AND (name LIKE ? ESCAPE '\\' OR slug LIKE ? ESCAPE '\\') ORDER BY usage_count DESC, updated_at DESC LIMIT 6")
      .all(like, like) as Topic[];
    const users = db
      .prepare(
        `
          SELECT id, username, display_name, bio, avatar_seed, avatar_url, total_score
          FROM users
          WHERE username LIKE ? ESCAPE '\\'
             OR display_name LIKE ? ESCAPE '\\'
             OR bio LIKE ? ESCAPE '\\'
          ORDER BY total_score DESC, display_name ASC
          LIMIT 6
        `
      )
      .all(like, like, like) as Record<string, unknown>[];
    const guilds = db
      .prepare("SELECT * FROM guilds WHERE status = 'active' AND (name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\') ORDER BY total_contribution DESC LIMIT 6")
      .all(like, like) as Record<string, unknown>[];
    const circles = db
      .prepare("SELECT * FROM circles WHERE status = 'active' AND (name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\') ORDER BY record_count DESC LIMIT 6")
      .all(like, like) as Record<string, unknown>[];
    const groups = db
      .prepare(
        `
          SELECT id, name, description, visibility, owner_user_id, member_count, created_at
          FROM "groups"
          WHERE status = 'active'
            AND visibility = 'public'
            AND (name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')
          ORDER BY member_count DESC, created_at DESC
          LIMIT 6
        `
      )
      .all(like, like) as Record<string, unknown>[];

    return {
      query,
      records: records.map((row) => publicFeedRecord(row, user?.id)),
      topics: topics.map(publicTopic),
      users: users.map(publicSearchUser),
      guilds: guilds.map((row) => publicGuild(row, user?.id)),
      circles: circles.map((row) => publicCircle(row, user?.id)),
      groups: groups.map((row) => ({
        id: Number(row.id),
        name: String(row.name),
        description: String(row.description ?? ''),
        visibility: String(row.visibility ?? 'public'),
        ownerUserId: Number(row.owner_user_id),
        memberCount: Number(row.member_count ?? 0),
        createdAt: String(row.created_at ?? '')
      }))
    };
  });

  app.get('/api/topics/:slug', async (request, reply) => {
    const parsed = topicParamSchema.safeParse(request.params);
    const query = topicDetailQuerySchema.safeParse(request.query);
    if (!parsed.success || !query.success) return reply.code(400).send({ message: '话题参数无效。' });
    const topic = db.prepare("SELECT * FROM topics WHERE slug = ? AND status = 'active'").get(parsed.data.slug) as Topic | undefined;
    if (!topic) return reply.code(404).send({ message: '话题不存在或已隐藏。' });
    const user = getUserFromRequest(request);
    const orderBy = getTopicOrderBy(query.data.filter);
    const rows = db
      .prepare(
        `
          SELECT slacking_records.*
          FROM record_topics
          JOIN slacking_records ON slacking_records.id = record_topics.record_id
          WHERE record_topics.topic_id = ?
            AND slacking_records.status = 'approved'
            AND slacking_records.visibility = 'public'
          ORDER BY ${orderBy}
          LIMIT 50
        `
      )
      .all(topic.id) as Record<string, unknown>[];

    return {
      topic: publicTopic(topic),
      filter: query.data.filter,
      records: rows.map((row) => publicFeedRecord(row, user?.id)),
      popularTopics: getPopularTopics(10).map(publicTopic)
    };
  });

  app.get('/api/community/overview', async (request) => {
    const user = getUserFromRequest(request);
    return {
      myStats: user ? getCommunityMyStats(user) : null,
      siteToday: getCommunitySiteToday(),
      todayTop: getLeaderboardRows('today').slice(0, 5).map(publicCommunityTopRow),
      featureFlags: communityFeatureFlags
    };
  });

  app.get('/api/community/feed', async (request, reply) => {
    const parsed = feedSchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: '社区筛选参数无效。' });
    const user = getUserFromRequest(request);
    const settings = getSiteSettings();
    return {
      filter: parsed.data.filter,
      records: getCommunityFeed(parsed.data.filter, user?.id),
      safetyNotice: settings.safetyNotice
    };
  });

  app.get('/api/community/hot', async (request) => {
    const user = getUserFromRequest(request);
    return { records: getCommunityFeed('hot', user?.id) };
  });

  app.post('/api/records/:id/like', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '记录 ID 无效。' });
    const record = db.prepare('SELECT id FROM slacking_records WHERE id = ?').get(params.data.id);
    if (!record) return reply.code(404).send({ message: '记录不存在。' });
    syncRecordReaction(params.data.id, user.id, 'like');
    return { record: publicCommunityFeedRecord(db.prepare('SELECT * FROM slacking_records WHERE id = ?').get(params.data.id) as Record<string, unknown>, user.id) };
  });

  app.post('/api/records/:id/nominate-legend', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    if (!getSiteSettings().legendNominationOpen) {
      return reply.code(403).send({ message: '传奇提名功能当前暂未开放。' });
    }
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '记录 ID 无效。' });
    const record = db.prepare('SELECT id FROM slacking_records WHERE id = ?').get(params.data.id);
    if (!record) return reply.code(404).send({ message: '记录不存在。' });
    try {
      syncRecordReaction(params.data.id, user.id, 'legend');
    } catch (error) {
      if (error instanceof Error && error.message === FISH_SCALE_INSUFFICIENT_MESSAGE) {
        return reply.code(400).send({ message: FISH_SCALE_INSUFFICIENT_MESSAGE });
      }
      throw error;
    }
    return { record: publicCommunityFeedRecord(db.prepare('SELECT * FROM slacking_records WHERE id = ?').get(params.data.id) as Record<string, unknown>, user.id) };
  });

  app.post('/api/records/:id/report', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = reportSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '举报信息无效。' });
    const record = db.prepare('SELECT id FROM slacking_records WHERE id = ?').get(params.data.id);
    if (!record) return reply.code(404).send({ message: '记录不存在。' });
    const result = db.prepare('INSERT OR IGNORE INTO reports (target_type, target_id, user_id, reason, created_at) VALUES (?, ?, ?, ?, ?)').run(
      'record',
      params.data.id,
      user.id,
      parsed.data.reason,
      new Date().toISOString()
    );
    const alreadyReported = Number(result.changes ?? 0) === 0;
    refreshRecordInteractionCounts(params.data.id);
    return {
      ok: true,
      alreadyReported,
      record: publicCommunityFeedRecord(db.prepare('SELECT * FROM slacking_records WHERE id = ?').get(params.data.id) as Record<string, unknown>, user.id)
    };
  });

  app.get('/api/guilds', async (request) => {
    refreshAllSocialAggregates();
    const user = getUserFromRequest(request);
    const rows = db.prepare("SELECT * FROM guilds WHERE status = 'active' ORDER BY total_contribution DESC, id ASC").all() as Record<string, unknown>[];
    const myGuild = user?.guildId ? rows.find((row) => Number(row.id) === user.guildId) : null;
    const ranking = db
      .prepare(
        `
          SELECT users.id, users.username, users.display_name, COALESCE(SUM(slacking_records.guild_contribution), 0) AS contribution
          FROM users
          JOIN guilds ON guilds.id = users.guild_id AND guilds.status = 'active'
          LEFT JOIN slacking_records ON slacking_records.user_id = users.id AND slacking_records.status = 'approved'
          WHERE users.guild_id IS NOT NULL
          GROUP BY users.id
          ORDER BY contribution DESC, users.display_name ASC
          LIMIT 10
        `
      )
      .all() as Record<string, unknown>[];
    return {
      myGuild: myGuild ? publicGuild(myGuild, user?.id) : null,
      guilds: rows.map((row) => publicGuild(row, user?.id)),
      ranking: ranking.map((row, index) => ({
        rank: index + 1,
        userId: Number(row.id),
        username: String(row.username),
        nickname: String(row.display_name),
        contribution: Number(row.contribution ?? 0)
      }))
    };
  });

  app.post('/api/guilds', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const parsed = guildSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: '工会信息无效。' });
    const safety = analyzeContentSafety(`${parsed.data.name} ${parsed.data.description}`);
    if (safety.level !== 'pass') {
      return reply.code(400).send({ message: '工会信息疑似包含未匿名化敏感内容。', safety });
    }

    const now = new Date().toISOString();
    let guildId = 0;
    let spendResult: ReturnType<typeof spendFishScale> | null = null;
    try {
      runInTransaction(() => {
        const owned = db
          .prepare("SELECT id FROM guilds WHERE owner_user_id = ? AND source = 'user' AND status != 'banned' LIMIT 1")
          .get(user.id);
        if (owned) throw new Error('USER_GUILD_ALREADY_EXISTS');
        const duplicate = db.prepare('SELECT id FROM guilds WHERE lower(name) = lower(?) LIMIT 1').get(parsed.data.name);
        if (duplicate) throw new Error('GUILD_NAME_DUPLICATE');

        spendResult = spendFishScale({
          userId: user.id,
          amount: 50,
          reason: 'guild_creation_spend',
          relatedType: 'guild',
          relatedId: null
        });
        if (!spendResult.transaction) throw new Error('GUILD_CREATION_SPEND_MISSING_TRANSACTION');

        const result = db
          .prepare(
            `
              INSERT INTO guilds (
                name,
                slug,
                description,
                icon,
                owner_user_id,
                created_by_user_id,
                source,
                join_policy,
                status,
                created_at,
                updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, 'user', 'open', 'active', ?, ?)
            `
          )
          .run(parsed.data.name, uniqueUserGuildSlug(), parsed.data.description, parsed.data.icon, user.id, user.id, now, now);
        guildId = Number(result.lastInsertRowid);
        db.prepare('UPDATE fish_scale_transactions SET related_id = ? WHERE id = ?').run(guildId, spendResult.transaction.id);
        spendResult = {
          ...spendResult,
          transaction: {
            ...spendResult.transaction,
            relatedId: guildId
          }
        };
        db.prepare('DELETE FROM guild_members WHERE user_id = ?').run(user.id);
        db.prepare('INSERT INTO guild_members (guild_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)').run(guildId, user.id, 'owner', now);
        db.prepare('UPDATE users SET guild_id = ?, updated_at = ? WHERE id = ?').run(guildId, now, user.id);
      });
    } catch (error) {
      if (error instanceof Error && error.message === FISH_SCALE_INSUFFICIENT_MESSAGE) {
        return reply.code(400).send({ message: FISH_SCALE_INSUFFICIENT_MESSAGE });
      }
      if (error instanceof Error && error.message === 'USER_GUILD_ALREADY_EXISTS') {
        return reply.code(409).send({ message: '每个用户最多只能拥有一个用户工会。' });
      }
      if (error instanceof Error && error.message === 'GUILD_NAME_DUPLICATE') {
        return reply.code(409).send({ message: '工会名称已存在。' });
      }
      throw error;
    }

    refreshAllSocialAggregates();
    const settledSpendResult = spendResult as ReturnType<typeof spendFishScale> | null;
    if (!settledSpendResult?.transaction) throw new Error('工会创建扣费流水缺失。');
    createGuildEvent({
      guildId,
      actorUserId: user.id,
      eventType: 'guild_created',
      targetType: 'guild',
      targetId: guildId,
      actorDisplayName: user.displayName
    });
    return reply.code(201).send({
      guild: publicGuild(db.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId) as Record<string, unknown>, user.id),
      wallet: settledSpendResult.wallet,
      transaction: settledSpendResult.transaction,
      message: '工会创建成功，会长已上任。'
    });
  });

  app.get('/api/guilds/:id/events', async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '工会 ID 无效。' });
    const guild = db.prepare("SELECT id FROM guilds WHERE id = ? AND status = 'active'").get(params.data.id);
    if (!guild) return reply.code(404).send({ message: '工会不存在。' });
    return { events: listGuildEvents(params.data.id, 50) };
  });

  app.get('/api/guilds/:id', async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '工会 ID 无效。' });
    const user = getUserFromRequest(request);
    const row = db.prepare("SELECT * FROM guilds WHERE id = ? AND status = 'active'").get(params.data.id) as Record<string, unknown> | undefined;
    if (!row) return reply.code(404).send({ message: '工会不存在。' });
    const records = db
      .prepare("SELECT * FROM slacking_records WHERE guild_id = ? AND status = 'approved' ORDER BY guild_contribution DESC, created_at DESC LIMIT 10")
      .all(params.data.id) as Record<string, unknown>[];
    return { guild: publicGuild(row, user?.id), records: records.map((record) => publicFeedRecord(record, user?.id)) };
  });

  app.patch('/api/guilds/:id', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = guildPatchSchema.safeParse(request.body);
    if (!params.success) return reply.code(400).send({ message: '工会 ID 无效。' });
    if (!parsed.success) return reply.code(400).send({ message: '工会信息无效。' });

    const before = db.prepare('SELECT * FROM guilds WHERE id = ?').get(params.data.id) as Record<string, unknown> | undefined;
    if (!before) return reply.code(404).send({ message: '工会不存在。' });
    if (String(before.source ?? 'official') === 'official') return reply.code(403).send({ message: '官方工会不能被普通用户修改。' });

    const member = db
      .prepare('SELECT role FROM guild_members WHERE guild_id = ? AND user_id = ?')
      .get(params.data.id, user.id) as { role: string } | undefined;
    if (member?.role !== 'owner') return reply.code(403).send({ message: '只有工会会长可以修改工会资料。' });

    const name = parsed.data.name ?? String(before.name);
    const description = parsed.data.description ?? String(before.description);
    const icon = parsed.data.icon ?? String(before.icon);
    const safety = analyzeContentSafety(`${name} ${description}`);
    if (safety.level !== 'pass') {
      return reply.code(400).send({ message: '工会信息疑似包含未匿名化敏感内容。', safety });
    }
    const duplicate = db.prepare('SELECT id FROM guilds WHERE lower(name) = lower(?) AND id != ? LIMIT 1').get(name, params.data.id);
    if (duplicate) return reply.code(409).send({ message: '工会名称已存在。' });

    db.prepare('UPDATE guilds SET name = ?, description = ?, icon = ?, updated_at = ? WHERE id = ?').run(
      name,
      description,
      icon,
      new Date().toISOString(),
      params.data.id
    );
    return {
      guild: publicGuild(db.prepare('SELECT * FROM guilds WHERE id = ?').get(params.data.id) as Record<string, unknown>, user.id),
      message: '工会资料已更新。'
    };
  });

  app.post('/api/guilds/:id/join', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '工会 ID 无效。' });
    const guild = db.prepare("SELECT * FROM guilds WHERE id = ? AND status = 'active'").get(params.data.id) as Record<string, unknown> | undefined;
    if (!guild) return reply.code(404).send({ message: '工会不存在。' });
    const currentMember = db
      .prepare('SELECT guild_id, role FROM guild_members WHERE user_id = ? LIMIT 1')
      .get(user.id) as { guild_id: number; role: string } | undefined;
    if (currentMember && Number(currentMember.guild_id) === params.data.id) {
      return { guild: publicGuild(guild, user.id) };
    }
    if (currentMember?.role === 'owner') {
      return reply.code(400).send({ message: '会长不能直接退出工会，请先转让或联系管理员处理。' });
    }
    const now = new Date().toISOString();
    runInTransaction(() => {
      db.prepare('DELETE FROM guild_members WHERE user_id = ?').run(user.id);
      db.prepare('INSERT INTO guild_members (guild_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)').run(params.data.id, user.id, 'member', now);
      db.prepare('UPDATE users SET guild_id = ?, updated_at = ? WHERE id = ?').run(params.data.id, now, user.id);
      db.prepare('UPDATE slacking_records SET guild_id = ? WHERE user_id = ? AND guild_id IS NULL').run(params.data.id, user.id);
    });
    const userRecords = db.prepare('SELECT id FROM slacking_records WHERE user_id = ?').all(user.id) as { id: number }[];
    for (const record of userRecords) refreshRecordInteractionCounts(record.id);
    refreshAllSocialAggregates();
    createGuildEvent({
      guildId: params.data.id,
      actorUserId: user.id,
      eventType: 'member_joined',
      targetType: 'guild',
      targetId: params.data.id,
      actorDisplayName: user.displayName
    });
    return {
      guild: publicGuild(db.prepare('SELECT * FROM guilds WHERE id = ?').get(params.data.id) as Record<string, unknown>, user.id),
      message: currentMember ? '已退出原工会并加入新工会。' : '已加入工会。'
    };
  });

  app.post('/api/guilds/:id/leave', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '工会 ID 无效。' });
    const guild = db.prepare('SELECT id FROM guilds WHERE id = ?').get(params.data.id);
    if (!guild) return reply.code(404).send({ message: '工会不存在。' });
    const member = db
      .prepare('SELECT role FROM guild_members WHERE guild_id = ? AND user_id = ?')
      .get(params.data.id, user.id) as { role: string } | undefined;
    if (!member) return reply.code(403).send({ message: '你不是该工会成员。' });
    if (member.role === 'owner') {
      return reply.code(400).send({ message: '会长不能直接退出工会，请先转让或联系管理员处理。' });
    }
    const now = new Date().toISOString();
    runInTransaction(() => {
      db.prepare('DELETE FROM guild_members WHERE guild_id = ? AND user_id = ?').run(params.data.id, user.id);
      db.prepare('UPDATE users SET guild_id = NULL, updated_at = ? WHERE id = ? AND guild_id = ?').run(now, user.id, params.data.id);
    });
    refreshAllSocialAggregates();
    createGuildEvent({
      guildId: params.data.id,
      actorUserId: user.id,
      eventType: 'member_left',
      targetType: 'guild',
      targetId: params.data.id,
      actorDisplayName: user.displayName
    });
    return { ok: true, message: '已退出工会。' };
  });

  app.post('/api/guilds/:id/members/:userId/remove', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const params = guildMemberParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '工会成员参数无效。' });
    const guild = db.prepare('SELECT id FROM guilds WHERE id = ?').get(params.data.id);
    if (!guild) return reply.code(404).send({ message: '工会不存在。' });
    const operator = db
      .prepare('SELECT role FROM guild_members WHERE guild_id = ? AND user_id = ?')
      .get(params.data.id, user.id) as { role: string } | undefined;
    if (operator?.role !== 'owner') return reply.code(403).send({ message: '只有工会会长可以移出成员。' });
    if (params.data.userId === user.id) return reply.code(400).send({ message: '会长不能把自己移出工会。' });
    const target = db
      .prepare('SELECT role FROM guild_members WHERE guild_id = ? AND user_id = ?')
      .get(params.data.id, params.data.userId) as { role: string } | undefined;
    if (!target) return reply.code(404).send({ message: '目标成员不存在。' });
    if (target.role === 'owner') return reply.code(400).send({ message: '不能移出工会会长。' });
    const targetUser = db.prepare('SELECT display_name FROM users WHERE id = ?').get(params.data.userId) as { display_name: string } | undefined;

    const now = new Date().toISOString();
    runInTransaction(() => {
      db.prepare('DELETE FROM guild_members WHERE guild_id = ? AND user_id = ?').run(params.data.id, params.data.userId);
      db.prepare('UPDATE users SET guild_id = NULL, updated_at = ? WHERE id = ? AND guild_id = ?').run(now, params.data.userId, params.data.id);
    });
    refreshAllSocialAggregates();
    createGuildEvent({
      guildId: params.data.id,
      actorUserId: user.id,
      eventType: 'member_removed',
      targetType: 'user',
      targetId: params.data.userId,
      actorDisplayName: user.displayName,
      targetDisplayName: targetUser?.display_name
    });
    return { ok: true, message: '成员已移出工会。' };
  });

  app.get('/api/guilds/:id/ranking', async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '工会 ID 无效。' });
    const guild = db.prepare("SELECT id FROM guilds WHERE id = ? AND status = 'active'").get(params.data.id);
    if (!guild) return reply.code(404).send({ message: '工会不存在。' });
    const rows = db
      .prepare(
        `
          SELECT users.id, users.username, users.display_name, COALESCE(SUM(slacking_records.guild_contribution), 0) AS contribution
          FROM guild_members
          JOIN users ON users.id = guild_members.user_id
          LEFT JOIN slacking_records ON slacking_records.user_id = users.id AND slacking_records.guild_id = guild_members.guild_id AND slacking_records.status = 'approved'
          WHERE guild_members.guild_id = ?
          GROUP BY users.id
          ORDER BY contribution DESC, users.display_name ASC
          LIMIT 20
        `
      )
      .all(params.data.id) as Record<string, unknown>[];
    return {
      rows: rows.map((row, index) => ({
        rank: index + 1,
        userId: Number(row.id),
        username: String(row.username),
        nickname: String(row.display_name),
        contribution: Number(row.contribution ?? 0)
      }))
    };
  });

  app.get('/api/guilds/:id/members', async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '工会 ID 无效。' });
    const guild = db.prepare("SELECT id FROM guilds WHERE id = ? AND status = 'active'").get(params.data.id);
    if (!guild) return reply.code(404).send({ message: '工会不存在。' });
    const rows = db
      .prepare(
        `
          SELECT users.id, users.username, users.display_name, guild_members.role, guild_members.joined_at
          FROM guild_members
          JOIN users ON users.id = guild_members.user_id
          WHERE guild_members.guild_id = ?
          ORDER BY guild_members.joined_at ASC
        `
      )
      .all(params.data.id) as Record<string, unknown>[];
    return { members: rows };
  });

  app.get('/api/guilds/:id/tasks', async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '工会 ID 无效。' });
    const guild = db.prepare("SELECT id FROM guilds WHERE id = ? AND status = 'active'").get(params.data.id);
    if (!guild) return reply.code(404).send({ message: '工会不存在。' });
    return {
      tasks: [
        { name: '今日集体摸鱼任务', target: '全员今日提交 3 条公开记录', reward: '+20 工会士气' },
        { name: '本周累计任务', target: '本周累计贡献达到 500', reward: '工位互助徽记' },
        { name: '传奇操作挑战', target: '产生 1 条传奇提名记录', reward: '传奇观察员称号' }
      ]
    };
  });

  app.get('/api/circles', async (request) => {
    refreshAllSocialAggregates();
    const user = getUserFromRequest(request);
    const rows = db.prepare('SELECT * FROM circles ORDER BY record_count DESC, member_count DESC, id ASC').all() as Record<string, unknown>[];
    const joined = user
      ? (db
          .prepare(
            `
              SELECT circles.*
              FROM circle_members
              JOIN circles ON circles.id = circle_members.circle_id
              WHERE circle_members.user_id = ?
              ORDER BY circles.name ASC
            `
          )
          .all(user.id) as Record<string, unknown>[])
      : [];
    return {
      recommended: rows.slice(0, 6).map((row) => publicCircle(row, user?.id)),
      hot: rows.slice(0, 6).map((row) => publicCircle(row, user?.id)),
      joined: joined.map((row) => publicCircle(row, user?.id)),
      circles: rows.map((row) => publicCircle(row, user?.id))
    };
  });

  app.get('/api/circles/:id', async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '圈子 ID 无效。' });
    const user = getUserFromRequest(request);
    const row = db.prepare('SELECT * FROM circles WHERE id = ?').get(params.data.id) as Record<string, unknown> | undefined;
    if (!row) return reply.code(404).send({ message: '圈子不存在。' });
    return { circle: publicCircle(row, user?.id) };
  });

  app.post('/api/circles/:id/join', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '圈子 ID 无效。' });
    const circle = db.prepare('SELECT * FROM circles WHERE id = ?').get(params.data.id) as Record<string, unknown> | undefined;
    if (!circle) return reply.code(404).send({ message: '圈子不存在。' });
    db.prepare('INSERT OR IGNORE INTO circle_members (circle_id, user_id, joined_at) VALUES (?, ?, ?)').run(params.data.id, user.id, new Date().toISOString());
    refreshAllSocialAggregates();
    return { circle: publicCircle(db.prepare('SELECT * FROM circles WHERE id = ?').get(params.data.id) as Record<string, unknown>, user.id) };
  });

  app.get('/api/circles/:id/feed', async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '圈子 ID 无效。' });
    const user = getUserFromRequest(request);
    const rows = db
      .prepare(
        `
          SELECT slacking_records.*
          FROM record_circles
          JOIN slacking_records ON slacking_records.id = record_circles.record_id
          WHERE record_circles.circle_id = ?
            AND slacking_records.status = 'approved'
            AND slacking_records.visibility = 'public'
          ORDER BY slacking_records.created_at DESC
          LIMIT 30
        `
      )
      .all(params.data.id) as Record<string, unknown>[];
    return { records: rows.map((row) => publicFeedRecord(row, user?.id)) };
  });

  app.get('/api/circles/:id/ranking', async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '圈子 ID 无效。' });
    const rows = db
      .prepare(
        `
          SELECT slacking_records.*
          FROM record_circles
          JOIN slacking_records ON slacking_records.id = record_circles.record_id
          WHERE record_circles.circle_id = ?
            AND slacking_records.status = 'approved'
            AND slacking_records.visibility = 'public'
          ORDER BY slacking_records.fish_power_score DESC, slacking_records.created_at DESC
          LIMIT 20
        `
      )
      .all(params.data.id) as Record<string, unknown>[];
    return { rows: mapRecordRows(rows.map((row) => ({ ...row, score: row.fish_power_score })), 'today') };
  });

  app.get('/api/groups/my', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    refreshAllSocialAggregates();
    const rows = db
      .prepare(
        `
          SELECT "groups".*
          FROM group_members
          JOIN "groups" ON "groups".id = group_members.group_id
          WHERE group_members.user_id = ?
          ORDER BY group_members.joined_at DESC
        `
      )
      .all(user.id) as Record<string, unknown>[];
    return { groups: rows.map((row) => publicGroup(row, user.id)), challenges: GROUP_CHALLENGES };
  });

  app.post('/api/groups', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    if (!getSiteSettings().groupCreationOpen) {
      return reply.code(403).send({ message: '小组创建功能当前暂未开放。' });
    }
    const parsed = groupSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: '小组信息无效。' });
    const safety = analyzeContentSafety(`${parsed.data.name} ${parsed.data.description}`);
    if (safety.level !== 'pass') return reply.code(400).send({ message: '请不要使用真实公司名、部门名、客户名或任何可识别身份的信息作为小组名称。', safety });
    const now = new Date().toISOString();
    let inviteCode = randomInviteCode();
    while (db.prepare('SELECT id FROM "groups" WHERE invite_code = ?').get(inviteCode)) inviteCode = randomInviteCode();
    let groupId = 0;
    try {
      runInTransaction(() => {
        spendFishScale({
          userId: user.id,
          amount: 50,
          reason: 'group_creation_spend',
          relatedType: 'group',
          relatedId: null
        });
        const result = db
          .prepare('INSERT INTO "groups" (name, description, visibility, invite_code, owner_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run(parsed.data.name, parsed.data.description, parsed.data.visibility, inviteCode, user.id, now);
        groupId = Number(result.lastInsertRowid);
        db.prepare(
          `
            UPDATE fish_scale_transactions
            SET related_id = ?
            WHERE id = (
              SELECT id
              FROM fish_scale_transactions
              WHERE user_id = ?
                AND reason = ?
                AND related_type = ?
                AND related_id IS NULL
              ORDER BY id DESC
              LIMIT 1
            )
          `
        ).run(
          groupId,
          user.id,
          'group_creation_spend',
          'group'
        );
        db.prepare('INSERT INTO group_members (group_id, user_id, role, nickname_title, joined_at) VALUES (?, ?, ?, ?, ?)').run(
          groupId,
          user.id,
          'owner',
          '地下茶水间管理员',
          now
        );
      });
    } catch (error) {
      if (error instanceof Error && error.message === FISH_SCALE_INSUFFICIENT_MESSAGE) {
        return reply.code(400).send({ message: FISH_SCALE_INSUFFICIENT_MESSAGE });
      }
      throw error;
    }
    refreshAllSocialAggregates();
    return reply.code(201).send({ group: publicGroup(db.prepare('SELECT * FROM "groups" WHERE id = ?').get(groupId) as Record<string, unknown>, user.id) });
  });

  app.post('/api/groups/join-by-code', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const parsed = inviteSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: '邀请码无效。' });
    const group = db.prepare('SELECT * FROM "groups" WHERE invite_code = ?').get(parsed.data.inviteCode.toUpperCase()) as Record<string, unknown> | undefined;
    if (!group) return reply.code(404).send({ message: '没有找到这个小组。' });
    db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id, role, nickname_title, joined_at) VALUES (?, ?, ?, ?, ?)').run(
      Number(group.id),
      user.id,
      'member',
      '',
      new Date().toISOString()
    );
    refreshAllSocialAggregates();
    return { group: publicGroup(db.prepare('SELECT * FROM "groups" WHERE id = ?').get(Number(group.id)) as Record<string, unknown>, user.id) };
  });

  app.get('/api/groups/:id', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '小组 ID 无效。' });
    const group = db.prepare('SELECT * FROM "groups" WHERE id = ?').get(params.data.id) as Record<string, unknown> | undefined;
    if (!group) return reply.code(404).send({ message: '小组不存在。' });
    const member = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(params.data.id, user.id);
    if (!member) return reply.code(403).send({ message: '你还没有加入这个小组。' });
    const members = db
      .prepare(
        `
          SELECT users.id, users.username, users.display_name, group_members.role, group_members.nickname_title
          FROM group_members
          JOIN users ON users.id = group_members.user_id
          WHERE group_members.group_id = ?
          ORDER BY group_members.joined_at ASC
        `
      )
      .all(params.data.id) as Record<string, unknown>[];
    return {
      group: publicGroup(group, user.id),
      members,
      challenges: GROUP_CHALLENGES,
      currentGoal: publicGroupGoalProgress(getCurrentGroupGoalProgress(params.data.id))
    };
  });

  app.get('/api/groups/:id/goals/current', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '小组 ID 无效。' });
    const member = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(params.data.id, user.id);
    if (!member) return reply.code(403).send({ message: '你还没有加入这个小组。' });
    return { currentGoal: publicGroupGoalProgress(getCurrentGroupGoalProgress(params.data.id)) };
  });

  app.post('/api/groups/:id/challenges', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = groupChallengeSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '小组挑战参数无效。' });
    const group = db.prepare('SELECT id FROM "groups" WHERE id = ?').get(params.data.id);
    if (!group) return reply.code(404).send({ message: '小组不存在。' });
    const member = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(params.data.id, user.id);
    if (!member) return reply.code(403).send({ message: '你还没有加入这个小组。' });
    const challenge = GROUP_CHALLENGES.find((item) => item.name === parsed.data.challengeName);
    if (!challenge) return reply.code(400).send({ message: '小组挑战不存在。' });
    try {
      const result = spendFishScale({
        userId: user.id,
        amount: 30,
        reason: 'group_challenge_spend',
        relatedType: 'group',
        relatedId: params.data.id
      });
      return {
        ok: true,
        challenge,
        wallet: result.wallet,
        transaction: result.transaction,
        message: '小组挑战已发起，鱼鳞在水面上划出一道认真摸鱼的波纹。'
      };
    } catch (error) {
      if (error instanceof Error && error.message === FISH_SCALE_INSUFFICIENT_MESSAGE) {
        return reply.code(400).send({ message: FISH_SCALE_INSUFFICIENT_MESSAGE });
      }
      throw error;
    }
  });

  app.get('/api/groups/:id/feed', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '小组 ID 无效。' });
    const member = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(params.data.id, user.id);
    if (!member) return reply.code(403).send({ message: '你还没有加入这个小组。' });
    const rows = db
      .prepare(
        `
          SELECT slacking_records.*
          FROM record_groups
          JOIN slacking_records ON slacking_records.id = record_groups.record_id
          WHERE record_groups.group_id = ?
            AND slacking_records.status = 'approved'
          ORDER BY record_groups.shared_at DESC
          LIMIT 30
        `
      )
      .all(params.data.id) as Record<string, unknown>[];
    return { records: rows.map((row) => publicFeedRecord(row, user.id)) };
  });

  app.get('/api/groups/:id/ranking', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '小组 ID 无效。' });
    const member = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(params.data.id, user.id);
    if (!member) return reply.code(403).send({ message: '你还没有加入这个小组。' });
    const rows = db
      .prepare(
        `
          SELECT users.id, users.username, users.display_name, COALESCE(SUM(slacking_records.fish_power_score), 0) AS score
          FROM group_members
          JOIN users ON users.id = group_members.user_id
          LEFT JOIN slacking_records ON slacking_records.user_id = users.id
          LEFT JOIN record_groups ON record_groups.record_id = slacking_records.id AND record_groups.group_id = group_members.group_id
          WHERE group_members.group_id = ?
          GROUP BY users.id
          ORDER BY score DESC, users.display_name ASC
        `
      )
      .all(params.data.id) as Record<string, unknown>[];
    return {
      rows: rows.map((row, index) => ({
        rank: index + 1,
        userId: Number(row.id),
        username: String(row.username),
        nickname: String(row.display_name),
        score: Number(row.score ?? 0)
      }))
    };
  });

  app.post('/api/groups/:id/share-record', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = shareGroupSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '小组分享参数无效。' });
    const member = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(params.data.id, user.id);
    if (!member) return reply.code(403).send({ message: '你还没有加入这个小组。' });
    const record = db.prepare('SELECT id FROM slacking_records WHERE id = ? AND user_id = ?').get(parsed.data.recordId, user.id);
    if (!record) return reply.code(404).send({ message: '只能同步自己的记录。' });
    const result = db
      .prepare('INSERT OR IGNORE INTO record_groups (record_id, group_id, shared_at) VALUES (?, ?, ?)')
      .run(parsed.data.recordId, params.data.id, new Date().toISOString());
    const completedGroupGoals = Number(result.changes ?? 0) > 0 ? checkAndCompleteGroupGoalsForRecord(parsed.data.recordId, [params.data.id]) : [];
    return { ok: true, completedGroupGoals: completedGroupGoals.map(publicGroupGoalProgress) };
  });

  app.post('/api/records', async (request, reply) => {
    const parsed = createRecordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: '提交内容不完整或格式无效。',
        issues: parsed.error.issues.map((issue) => issue.message)
      });
    }

    const anonymized = parsed.data.anonymized ?? parsed.data.anonymous_confirm ?? false;
    if (!anonymized) return reply.code(400).send({ message: '提交前请确认已匿名化内容。' });

    const user = getUserFromRequest(request);
    const nickname = normalizeNickname(user?.displayName ?? parsed.data.nickname ?? '');
    const activityText = normalizeActivityText(parsed.data.activityText ?? parsed.data.activity_text ?? parsed.data.slackingType ?? '');
    const storyText = String(parsed.data.storyText ?? parsed.data.story_text ?? parsed.data.description ?? '').trim();
    const risk = parsed.data.risk ?? RISKS[1].key;
    const disguise = parsed.data.disguise ?? DISGUISES[0].key;
    const creativity = parsed.data.creativity ?? CREATIVITY_LEVELS[0].key;
    const privateOnly = Boolean(parsed.data.privateOnly) || parsed.data.publish_scope === 'private';
    const publishToCommunity = parsed.data.publish_scope === 'private' ? false : (parsed.data.publishToCommunity ?? true);
    const visibility = privateOnly || !publishToCommunity ? 'private' : 'public';
    const settings = getSiteSettings();
    if (!settings.communityOpen && visibility === 'public') {
      return reply.code(403).send({ message: '社区当前暂未开放。' });
    }
    const normalizedTopics = normalizeTopicList(parsed.data.topics ?? [], enabledSensitiveWords());
    if (normalizedTopics.error) {
      return reply.code(400).send({
        message: normalizedTopics.error === TOPIC_PRIVACY_MESSAGE ? TOPIC_PRIVACY_MESSAGE : normalizedTopics.error
      });
    }
    if (normalizedTopics.topics.length > MAX_TOPICS_PER_RECORD) {
      return reply.code(400).send({ message: `每条记录最多添加 ${MAX_TOPICS_PER_RECORD} 个话题。` });
    }
    const safety = analyzeContentSafety(`${nickname} ${activityText} ${storyText} ${normalizedTopics.topics.join(' ')}`);
    if (safety.level === 'block') {
      return reply.code(400).send({
        message: '内容里疑似包含敏感信息，请匿名化摸鱼事项和描述后再提交。',
        safety
      });
    }

    // risk/disguise/creativity are stored as user-selected metadata for display,
    // grouping, and leaderboards. The AI judge derives the authoritative score
    // from duration plus the submitted activity/story text so clients cannot
    // game score math by sending high-value enum fields.
    const scoreInput = {
      duration: parsed.data.duration,
      activityText,
      slackingType: activityText,
      storyText
    };
    const aiScore = await scoreRecordWithAiJudge(scoreInput);
    const score = aiScore.breakdown;
    const isNonSlackingEvent = score.valid === false && score.reason === 'not_slacking_event';
    const totalScore = (user ? getUserTotalScore(user.id) : getNicknameTotalScore(nickname)) + score.fishPowerScore;
    const title = getTitleForTotalScore(totalScore);
    const systemComment = aiScore.comment;
    // AI valid=false/not_slacking_event affects rewards and notes, not moderation status.
    const status =
      safety.level === 'review'
        ? 'pending'
        : settings.defaultRecordStatus === 'pending'
          ? 'pending'
          : 'approved';
    const reviewNote = isNonSlackingEvent ? 'not_slacking_event' : safety.warnings.join('\u3001');
    const groupIds = user && !privateOnly ? userGroupIds(user.id, parsed.data.groupIds ?? []) : [];

    let record: ReturnType<typeof insertRecord> | null = null;
    let fishScaleReward: ReturnType<typeof grantRecordSubmissionFishScale> | null = null;
    let completedGroupGoals: ReturnType<typeof checkAndCompleteGroupGoalsForRecord> = [];
    runInTransaction(() => {
      record = insertRecord(
        {
          ...parsed.data,
          userId: user?.id,
          nickname,
          slackingType: activityText,
          slackingTypeId: activityText,
          slackingTypeGroup: 'activity',
          activityText,
          duration: score.duration ?? parsed.data.duration,
          risk,
          disguise,
          creativity,
          description: storyText,
          storyText,
          title,
          systemComment,
          status,
          reviewNote,
          visibility,
          guildId: user?.guildId ?? null,
          groupIds,
          topics: normalizedTopics.topics,
          autoCircles: (parsed.data.autoCircles ?? true) && visibility === 'public',
          createdAt: new Date().toISOString()
        },
        score
      );

      if (record.status === 'approved' && record.guild_id) {
        createGuildEvent({
          guildId: Number(record.guild_id),
          actorUserId: user?.id ?? null,
          eventType: 'record_contributed',
          targetType: 'record',
          targetId: record.id,
          actorDisplayName: user?.displayName ?? nickname,
          contribution: Number(record.guild_contribution ?? 0)
        });
      }
      fishScaleReward = user && !isNonSlackingEvent
        ? grantRecordSubmissionFishScale({
            userId: user.id,
            recordId: record.id,
            fishPowerScore: score.fishPowerScore
          })
        : null;
      completedGroupGoals = checkAndCompleteGroupGoalsForRecord(record.id, groupIds);
    });
    if (!record) throw new Error('RECORD_INSERT_FAILED');

    const todayRank = status === 'approved' ? getRecordTodayRank(record, getTodayRange()) : 0;

    return reply.code(201).send({
      record: publicRecord(record as unknown as Record<string, unknown>),
      todayRank,
      cumulativeScore: Number(totalScore.toFixed(1)),
      title,
      systemComment,
      fishScaleReward,
      completedGroupGoals: completedGroupGoals.map(publicGroupGoalProgress),
      safety,
      leaderboards: {
        today: getLeaderboardRows('today'),
        week: getLeaderboardRows('week'),
        month: getLeaderboardRows('month'),
        season: getLeaderboardRows('season'),
        disguise: getLeaderboardRows('disguise'),
        meeting: getLeaderboardRows('meeting'),
        legendary: getLeaderboardRows('legendary')
      }
    });
  });

  app.get('/api/records/:id/social', async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '记录 ID 无效。' });
    const user = getUserFromRequest(request);
    const record = db.prepare('SELECT * FROM slacking_records WHERE id = ?').get(params.data.id) as Record<string, unknown> | undefined;
    if (!record || !canViewRecord(record, user)) return reply.code(404).send({ message: '记录不存在或不可公开访问。' });
    const social = getSocialSummary(params.data.id, user?.id);
    if (!social) return reply.code(404).send({ message: '记录不存在。' });
    return {
      ...social,
      record: publicCommunityFeedRecord(record, user?.id)
    };
  });

  app.get('/api/records/:id/related', async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '记录 ID 无效。' });
    const user = getUserFromRequest(request);
    const record = db
      .prepare("SELECT * FROM slacking_records WHERE id = ? AND status = 'approved' AND visibility = 'public'")
      .get(params.data.id) as Record<string, unknown> | undefined;
    if (!record) return reply.code(404).send({ message: '记录不存在或不可公开推荐。' });
    const slackingType = String(record.slacking_type_id || record.slacking_type || '');
    const score = Number(record.fish_power_score ?? 0);
    const guildId = record.guild_id === null || record.guild_id === undefined ? null : Number(record.guild_id);
    const rows = db
      .prepare(
        `
          SELECT DISTINCT slacking_records.*
          FROM slacking_records
          WHERE slacking_records.id != ?
            AND slacking_records.status = 'approved'
            AND slacking_records.visibility = 'public'
            AND (
              COALESCE(NULLIF(slacking_records.slacking_type_id, ''), slacking_records.slacking_type) = ?
              OR COALESCE(slacking_records.guild_id, -1) = COALESCE(?, -1)
              OR ABS(slacking_records.fish_power_score - ?) <= 50
              OR EXISTS (
                SELECT 1
                FROM record_topics current_topics
                JOIN record_topics candidate_topics ON candidate_topics.topic_id = current_topics.topic_id
                WHERE current_topics.record_id = ?
                  AND candidate_topics.record_id = slacking_records.id
              )
              OR EXISTS (
                SELECT 1
                FROM record_circles current_circles
                JOIN record_circles candidate_circles ON candidate_circles.circle_id = current_circles.circle_id
                WHERE current_circles.record_id = ?
                  AND candidate_circles.record_id = slacking_records.id
              )
              OR EXISTS (
                SELECT 1
                FROM record_groups current_groups
                JOIN record_groups candidate_groups ON candidate_groups.group_id = current_groups.group_id
                WHERE current_groups.record_id = ?
                  AND candidate_groups.record_id = slacking_records.id
              )
            )
          ORDER BY
            CASE WHEN COALESCE(NULLIF(slacking_records.slacking_type_id, ''), slacking_records.slacking_type) = ? THEN 0 ELSE 1 END,
            ABS(slacking_records.fish_power_score - ?) ASC,
            slacking_records.like_count DESC,
            slacking_records.created_at DESC
          LIMIT 5
        `
      )
      .all(
        params.data.id,
        slackingType,
        guildId,
        score,
        params.data.id,
        params.data.id,
        params.data.id,
        slackingType,
        score
      ) as Record<string, unknown>[];
    return { records: rows.map((row) => publicFeedRecord(row, user?.id)) };
  });

  app.post('/api/records/:id/interactions', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = interactionSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '互动参数无效。' });
    if (parsed.data.action === 'vote' && !getSiteSettings().legendNominationOpen) {
      return reply.code(403).send({ message: '传奇提名功能当前暂未开放。' });
    }

    const record = db.prepare('SELECT id FROM slacking_records WHERE id = ?').get(params.data.id);
    if (!record) return reply.code(404).send({ message: '记录不存在。' });

    const viewerFlags = getViewerFlags(params.data.id, user.id);
    const reactionFlags = getRecordReactionFlags(params.data.id, user.id);
    const alreadyActive =
      parsed.data.action === 'like'
        ? viewerFlags.liked || reactionFlags.liked
        : parsed.data.action === 'favorite'
          ? viewerFlags.favorited
          : viewerFlags.voted || reactionFlags.legendNominated;

    if (parsed.data.active) {
      if (parsed.data.action === 'vote' && !alreadyActive) {
        try {
          spendLegendNominationFishScale(params.data.id, user.id);
        } catch (error) {
          if (error instanceof Error && error.message === FISH_SCALE_INSUFFICIENT_MESSAGE) {
            return reply.code(400).send({ message: FISH_SCALE_INSUFFICIENT_MESSAGE });
          }
          throw error;
        }
      }
      const result = db.prepare('INSERT OR IGNORE INTO record_interactions (record_id, user_id, action, created_at) VALUES (?, ?, ?, ?)').run(
        params.data.id,
        user.id,
        parsed.data.action,
        new Date().toISOString()
      );
      if (parsed.data.action === 'like' || parsed.data.action === 'vote') {
        db.prepare('INSERT OR IGNORE INTO reactions (target_type, target_id, user_id, reaction_type, created_at) VALUES (?, ?, ?, ?, ?)').run(
          'record',
          params.data.id,
          user.id,
          parsed.data.action === 'vote' ? 'legend' : 'like',
          new Date().toISOString()
        );
      }
      if (Number(result.changes ?? 0) > 0 && parsed.data.action === 'like') {
        awardRecordLikeFishScale(params.data.id, user.id);
      }
      if (parsed.data.action === 'vote' && !alreadyActive) {
        awardLegendNominationFishScale(params.data.id, user.id);
      }
    } else {
      db.prepare('DELETE FROM record_interactions WHERE record_id = ? AND user_id = ? AND action = ?').run(
        params.data.id,
        user.id,
        parsed.data.action
      );
      if (parsed.data.action === 'like' || parsed.data.action === 'vote') {
        db.prepare("DELETE FROM reactions WHERE target_type = 'record' AND target_id = ? AND user_id = ? AND reaction_type = ?").run(
          params.data.id,
          user.id,
          parsed.data.action === 'vote' ? 'legend' : 'like'
        );
      }
    }

    refreshRecordInteractionCounts(params.data.id);
    const social = getSocialSummary(params.data.id, user.id);
    if (!social) return reply.code(404).send({ message: '记录不存在。' });
    return {
      ...social,
      record: publicCommunityFeedRecord(db.prepare('SELECT * FROM slacking_records WHERE id = ?').get(params.data.id) as Record<string, unknown>, user.id)
    };
  });

  app.post('/api/records/:id/comments', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    if (!getSiteSettings().commentsOpen) {
      return reply.code(403).send({ message: '评论功能当前暂未开放。' });
    }
    if (isMuted(user)) return reply.code(403).send({ message: '账号当前处于禁言状态，暂时不能发表评论。' });
    const params = idParamSchema.safeParse(request.params);
    const parsed = commentSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '评论内容无效。' });

    const record = db.prepare('SELECT id FROM slacking_records WHERE id = ?').get(params.data.id);
    if (!record) return reply.code(404).send({ message: '记录不存在。' });

    const safety = analyzeContentSafety(parsed.data.content);
    if (safety.level === 'block') return reply.code(400).send({ message: '评论疑似包含敏感信息，请修改后再发。', safety });

    const now = new Date().toISOString();
    const result = db.prepare(
      `
        INSERT INTO comments (record_id, user_id, nickname, content, status, review_note, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(params.data.id, user.id, user.displayName, parsed.data.content, safety.level === 'review' ? 'pending' : 'approved', safety.warnings.join('、'), now, now);
    if (safety.level !== 'review') {
      awardRecordCommentFishScale(params.data.id, Number(result.lastInsertRowid), user.id);
    }
    refreshRecordInteractionCounts(params.data.id);
    const social = getSocialSummary(params.data.id, user.id);
    if (!social) return reply.code(404).send({ message: '记录不存在。' });
    return reply.code(201).send({
      ...social,
      record: publicCommunityFeedRecord(db.prepare('SELECT * FROM slacking_records WHERE id = ?').get(params.data.id) as Record<string, unknown>, user.id),
      safety
    });
  });

  app.post('/api/records/:id/comment', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    if (!getSiteSettings().commentsOpen) {
      return reply.code(403).send({ message: '评论功能当前暂未开放。' });
    }
    if (isMuted(user)) return reply.code(403).send({ message: '账号当前处于禁言状态，暂时不能发表评论。' });
    const params = idParamSchema.safeParse(request.params);
    const parsed = commentSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '评论内容无效。' });

    const record = db.prepare('SELECT id FROM slacking_records WHERE id = ?').get(params.data.id);
    if (!record) return reply.code(404).send({ message: '记录不存在。' });

    const safety = analyzeContentSafety(parsed.data.content);
    if (safety.level === 'block') return reply.code(400).send({ message: '评论疑似包含敏感信息，请修改后再发。', safety });

    const now = new Date().toISOString();
    const result = db.prepare(
      `
        INSERT INTO comments (record_id, user_id, nickname, content, status, review_note, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(params.data.id, user.id, user.displayName, parsed.data.content, safety.level === 'review' ? 'pending' : 'approved', safety.warnings.join('、'), now, now);
    if (safety.level !== 'review') {
      awardRecordCommentFishScale(params.data.id, Number(result.lastInsertRowid), user.id);
    }
    refreshRecordInteractionCounts(params.data.id);
    return reply.code(201).send({
      record: publicCommunityFeedRecord(db.prepare('SELECT * FROM slacking_records WHERE id = ?').get(params.data.id) as Record<string, unknown>, user.id),
      safety
    });
  });

  app.get('/api/records/:id/share-card', async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '记录 ID 无效。' });
    const user = getUserFromRequest(request);
    const record = db.prepare('SELECT * FROM slacking_records WHERE id = ?').get(params.data.id) as Record<string, unknown> | undefined;
    if (!record || !canViewRecord(record, user)) return reply.code(404).send({ message: '记录不存在或不可公开访问。' });
    return createShareCard(publicRecord(record));
  });

  app.post('/api/records/:id/share-card', async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    const parsed = shareCardActionSchema.safeParse(request.body ?? {});
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '分享动作无效。' });
    const user = getUserFromRequest(request);
    const record = db.prepare('SELECT * FROM slacking_records WHERE id = ?').get(params.data.id) as Record<string, unknown> | undefined;
    if (!record || !canViewRecord(record, user)) return reply.code(404).send({ message: '记录不存在或不可公开访问。' });
    db.prepare('UPDATE slacking_records SET share_count = share_count + 1, updated_at = ? WHERE id = ?').run(new Date().toISOString(), params.data.id);
    const updated = db.prepare('SELECT * FROM slacking_records WHERE id = ?').get(params.data.id) as Record<string, unknown>;
    return createShareCard(publicRecord(updated));
  });

  app.get('/api/badges/me', async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    return { badges: getBadgesForUser(user.id) };
  });

  await registerAdminRoutes(app);
};
