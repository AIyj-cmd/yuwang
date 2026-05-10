import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CREATIVITY_LEVELS,
  DISGUISES,
  DURATIONS,
  MAX_DESCRIPTION_LENGTH,
  RISKS,
  SAFETY_NOTICE,
  analyzeContentSafety,
  getOptionLabel
} from '../shared/scoring.js';
import { CIRCLE_FEATURED_BOARDS, COMMENT_MAX_LENGTH, GROUP_NAME_MAX_LENGTH, getGuildLevel } from '../shared/social.js';
import { normalizeTopicName, validateTopicName } from '../shared/topics.js';
import {
  FISH_SCALE_INSUFFICIENT_MESSAGE,
  adjustFishScale,
  db,
  getFishScaleWallet,
  grantInteractionFishScale,
  grantLegendSelectedFishScale,
  makeUniqueTopicSlug,
  refreshAllSocialAggregates,
  refreshRecordInteractionCounts
} from './database.js';
import {
  clearAdminCookie,
  createAdminSessionToken,
  ensureAdminConfigured,
  getAdminSession,
  requireAdminSession,
  setAdminCookie,
  verifyAdminCredentials,
  writeAdminAuditLog
} from './adminAuth.js';
import { getTodayRange } from './time.js';

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20)
});
const walletQuerySchema = pageQuerySchema.extend({
  keyword: z.string().trim().max(80).default('')
});
const transactionQuerySchema = pageQuerySchema.extend({
  keyword: z.string().trim().max(80).default(''),
  type: z.string().trim().max(40).default('')
});
const walletAdjustmentSchema = z.object({
  amount: z.coerce.number().int().min(-10000).max(10000).refine((value) => value !== 0, {
    message: '调整数量不能为 0'
  }),
  reason: z.string().trim().min(2).max(160)
});
const adminLoginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200)
});
const recordQuerySchema = pageQuerySchema.extend({
  status: z.enum(['all', 'published', 'pending', 'hidden', 'rejected']).default('all'),
  keyword: z.string().trim().max(80).default(''),
  date_from: z.string().trim().max(30).optional(),
  date_to: z.string().trim().max(30).optional(),
  min_score: z.coerce.number().optional(),
  max_score: z.coerce.number().optional()
});
const recordStatusSchema = z.object({
  action: z.enum(['approve', 'hide', 'reject', 'restore']),
  reviewNote: z.string().trim().max(240).default(''),
  hiddenReason: z.string().trim().max(240).default('')
});
const recordPatchSchema = z.object({
  reviewNote: z.string().trim().max(240).optional(),
  hiddenReason: z.string().trim().max(240).optional(),
  visibility: z.enum(['public', 'private']).optional()
});
const legendSelectedSchema = z.object({
  selected: z.boolean()
});
const reportQuerySchema = pageQuerySchema.extend({
  status: z.enum(['all', 'pending', 'reviewing', 'resolved', 'rejected']).default('pending'),
  target_type: z.enum(['all', 'record', 'comment', 'user', 'group']).default('all'),
  keyword: z.string().trim().max(80).default('')
});
const reportStatusSchema = z.object({
  status: z.enum(['pending', 'reviewing', 'resolved', 'rejected']),
  adminNote: z.string().trim().max(240).default(''),
  hideTarget: z.boolean().default(false)
});
const commentsQuerySchema = pageQuerySchema.extend({
  status: z.enum(['all', 'published', 'pending', 'hidden', 'rejected']).default('all'),
  keyword: z.string().trim().max(80).default('')
});
const topicQuerySchema = pageQuerySchema.extend({
  status: z.enum(['all', 'active', 'hidden']).default('all'),
  keyword: z.string().trim().max(80).default('')
});
const topicPatchSchema = z.object({
  name: z.string().trim().min(1).max(40)
});
const topicStatusSchema = z.object({ status: z.enum(['active', 'hidden']) });
const commentStatusSchema = z.object({
  action: z.enum(['approve', 'hide', 'reject', 'restore']),
  reviewNote: z.string().trim().max(240).default('')
});
const userStatusSchema = z.object({
  status: z.enum(['active', 'muted', 'banned']),
  muteUntil: z.string().trim().max(40).default(''),
  banReason: z.string().trim().max(240).default('')
});
const entitySchema = z.object({
  name: z.string().trim().min(2).max(40),
  description: z.string().trim().max(180).default(''),
  icon: z.string().trim().min(1).max(4).default('官')
});
const entityPatchSchema = z.object({
  name: z.string().trim().min(2).max(40).optional(),
  description: z.string().trim().max(180).optional(),
  icon: z.string().trim().min(1).max(4).optional()
});
const entityStatusSchema = z.object({ status: z.enum(['active', 'inactive', 'hidden']) });
const settingsSchema = z.object({
  communityOpen: z.boolean().optional(),
  commentsOpen: z.boolean().optional(),
  groupCreationOpen: z.boolean().optional(),
  legendNominationOpen: z.boolean().optional(),
  commentMaxLength: z.number().int().min(20).max(500).optional(),
  descriptionMaxLength: z.number().int().min(40).max(1000).optional(),
  defaultRecordStatus: z.enum(['published', 'pending']).optional(),
  safetyNotice: z.string().trim().min(10).max(500).optional()
});
const sensitiveWordSchema = z.object({
  id: z.number().int().positive().optional(),
  word: z.string().trim().min(1).max(40),
  category: z.string().trim().min(1).max(30).default('隐私身份'),
  severity: z.enum(['low', 'medium', 'high']).default('medium'),
  enabled: z.boolean().default(true)
});
const sensitiveWordsSchema = z.object({ words: z.array(sensitiveWordSchema).max(200) });

type SqlRow = Record<string, unknown>;
type SqlParam = string | number | null;

const publishedSql = "status IN ('approved', 'published')";
const hiddenSql = "status IN ('hidden', 'rejected')";

const dbToAdminStatus = (status: unknown): string => {
  const value = String(status ?? 'approved');
  return value === 'approved' ? 'published' : value;
};

const adminToDbStatus = (status: string): string => (status === 'published' ? 'approved' : status);

const actionToDbStatus = (action: string): string => {
  if (action === 'approve' || action === 'restore') return 'approved';
  if (action === 'hide') return 'hidden';
  return 'rejected';
};

const splitFlags = (value: unknown): string[] =>
  String(value ?? '')
    .split(/[、,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const count = (sql: string, ...params: SqlParam[]): number =>
  Number((db.prepare(sql).get(...params) as { count?: number } | undefined)?.count ?? 0);

const runPaged = (baseSql: string, countSql: string, params: SqlParam[], page: number, pageSize: number): { rows: SqlRow[]; total: number } => ({
  rows: db.prepare(`${baseSql} LIMIT ? OFFSET ?`).all(...params, pageSize, (page - 1) * pageSize) as SqlRow[],
  total: count(countSql, ...params)
});

const uniqueSlug = (prefix: string, table: 'guilds' | 'circles'): string => {
  let slug = `${prefix}-${Date.now().toString(36)}`;
  while (db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug)) {
    slug = `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
  }
  return slug;
};

const rejectUnsafeEntity = (text: string) => analyzeContentSafety(text).level === 'block';

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

const adminRecord = (row: SqlRow) => ({
  id: Number(row.id),
  userId: row.user_id === null || row.user_id === undefined ? null : Number(row.user_id),
  username: String(row.username ?? ''),
  nickname: String(row.nickname ?? ''),
  slackingType: String(row.slacking_type_id || row.slacking_type || ''),
  slackingTypeLabel: String(row.activity_text || row.slacking_type || row.slacking_type_id || ''),
  activityText: String(row.activity_text || row.slacking_type || ''),
  activityTags: parseActivityTags(row.activity_tags),
  duration: String(row.duration ?? ''),
  durationLabel: getOptionLabel(DURATIONS, String(row.duration ?? '')),
  risk: String(row.risk ?? ''),
  riskLabel: getOptionLabel(RISKS, String(row.risk ?? '')),
  disguise: String(row.disguise ?? ''),
  disguiseLabel: getOptionLabel(DISGUISES, String(row.disguise ?? '')),
  creativity: String(row.creativity ?? ''),
  creativityLabel: getOptionLabel(CREATIVITY_LEVELS, String(row.creativity ?? '')),
  storyText: String(row.story_text || row.description || ''),
  description: String(row.story_text || row.description || ''),
  durationScore: Number(row.duration_score ?? 0),
  score: Number(row.fish_power_score ?? 0),
  title: String(row.title ?? ''),
  systemComment: String(row.system_comment ?? ''),
  status: dbToAdminStatus(row.status),
  reviewNote: String(row.review_note ?? ''),
  visibility: String(row.visibility ?? 'public'),
  sensitiveFlags: [...splitFlags(row.sensitive_flags), ...splitFlags(row.review_note)],
  reviewedBy: String(row.reviewed_by ?? ''),
  reviewedAt: String(row.reviewed_at ?? ''),
  hiddenReason: String(row.hidden_reason ?? ''),
  likeCount: Number(row.like_count ?? 0),
  favoriteCount: Number(row.favorite_count ?? 0),
  voteCount: Number(row.vote_count ?? 0),
  legendNominationCount: Number(row.legend_nomination_count ?? 0),
  legendSelected: Boolean(row.legend_selected),
  reportCount: Number(row.report_count ?? 0),
  commentCount: Number(row.comment_count ?? 0),
  shareCount: Number(row.share_count ?? 0),
  scoreVersion: String(row.score_version ?? 'legacy_type_v1'),
  createdAt: String(row.created_at ?? ''),
  updatedAt: String(row.updated_at ?? ''),
  breakdown: {
    baseScore: Number(row.base_score ?? 0),
    durationScore:
      Number(row.duration_score ?? 0) ||
      Number(row.duration_base_score ?? 0) ||
      Number((Number(row.base_score ?? 0) * Number(row.duration_multiplier ?? 1)).toFixed(1)),
    durationBaseScore:
      Number(row.duration_base_score ?? 0) ||
      Number((Number(row.base_score ?? 0) * Number(row.duration_multiplier ?? 1)).toFixed(1)),
    durationMultiplier: Number(row.duration_multiplier ?? 0),
    riskMultiplier: Number(row.risk_multiplier ?? 0),
    disguiseBonus: Number(row.disguise_bonus ?? 0),
    creativityBonus: Number(row.creativity_bonus ?? 0)
  }
});

const adminComment = (row: SqlRow) => ({
  id: Number(row.id),
  recordId: Number(row.record_id ?? 0),
  userId: Number(row.user_id ?? 0),
  username: String(row.username ?? ''),
  nickname: String(row.nickname ?? ''),
  content: String(row.content ?? ''),
  status: dbToAdminStatus(row.status),
  reviewNote: String(row.review_note ?? ''),
  sensitiveFlags: [...splitFlags(row.sensitive_flags), ...splitFlags(row.review_note)],
  reviewedBy: String(row.reviewed_by ?? ''),
  reviewedAt: String(row.reviewed_at ?? ''),
  createdAt: String(row.created_at ?? ''),
  updatedAt: String(row.updated_at ?? '')
});

const adminReport = (row: SqlRow) => ({
  id: Number(row.id),
  targetType: String(row.target_type ?? ''),
  targetId: Number(row.target_id ?? 0),
  userId: Number(row.user_id ?? 0),
  username: String(row.username ?? ''),
  nickname: String(row.display_name ?? row.nickname ?? ''),
  reason: String(row.reason ?? ''),
  status: String(row.status ?? 'pending'),
  adminNote: String(row.admin_note ?? ''),
  resolvedBy: String(row.resolved_by ?? ''),
  resolvedAt: String(row.resolved_at ?? ''),
  createdAt: String(row.created_at ?? '')
});

const adminTopic = (row: SqlRow) => ({
  id: Number(row.id),
  name: String(row.name ?? ''),
  slug: String(row.slug ?? ''),
  usageCount: Number(row.usage_count ?? 0),
  status: String(row.status ?? 'active'),
  createdAt: String(row.created_at ?? ''),
  updatedAt: String(row.updated_at ?? '')
});

const adminAudit = (row: SqlRow) => ({
  id: Number(row.id),
  adminUsername: String(row.admin_username ?? ''),
  action: String(row.action ?? ''),
  targetType: String(row.target_type ?? ''),
  targetId: String(row.target_id ?? ''),
  beforeJson: String(row.before_json ?? ''),
  afterJson: String(row.after_json ?? ''),
  ip: String(row.ip ?? ''),
  userAgent: String(row.user_agent ?? ''),
  createdAt: String(row.created_at ?? '')
});

const adminWallet = (row: SqlRow) => {
  const userId = Number(row.user_id ?? row.id);
  const totalEarned = Number(row.fish_scale_total_earned ?? 0);
  return {
    userId,
    username: String(row.username ?? ''),
    displayName: String(row.display_name ?? ''),
    balance: Number(row.fish_scale_balance ?? 0),
    totalEarned,
    totalSpent: Number(row.fish_scale_total_spent ?? 0),
    level: getFishScaleWallet(userId).level,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? '')
  };
};

const adminFishScaleTransaction = (row: SqlRow) => ({
  id: Number(row.id),
  userId: Number(row.user_id ?? 0),
  username: String(row.username ?? ''),
  displayName: String(row.display_name ?? ''),
  amount: Number(row.amount ?? 0),
  type: String(row.type ?? ''),
  reason: String(row.reason ?? ''),
  relatedType: String(row.related_type ?? ''),
  relatedId: row.related_id === null || row.related_id === undefined ? null : Number(row.related_id),
  balanceAfter: Number(row.balance_after ?? 0),
  createdAt: String(row.created_at ?? '')
});

const enabledSensitiveWords = (): string[] =>
  (
    db
      .prepare('SELECT word FROM sensitive_words WHERE enabled = 1')
      .all() as { word: string }[]
  ).map((row) => row.word);

const settingsMap = () => {
  const rows = db.prepare('SELECT key, value FROM site_settings').all() as { key: string; value: string }[];
  const map = new Map(rows.map((row) => [row.key, row.value]));
  return {
    communityOpen: map.get('community_open') !== 'false',
    commentsOpen: map.get('comments_open') !== 'false',
    groupCreationOpen: map.get('group_creation_open') !== 'false',
    legendNominationOpen: map.get('legend_nomination_open') !== 'false',
    commentMaxLength: Number(map.get('comment_max_length') ?? COMMENT_MAX_LENGTH),
    descriptionMaxLength: Number(map.get('description_max_length') ?? MAX_DESCRIPTION_LENGTH),
    defaultRecordStatus: map.get('default_record_status') === 'pending' ? 'pending' : 'published',
    safetyNotice: map.get('safety_notice') ?? SAFETY_NOTICE
  };
};

const saveSetting = (key: string, value: string): void => {
  db.prepare(
    `
      INSERT INTO site_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `
  ).run(key, value, new Date().toISOString());
};

const updateStatus = (target: 'record' | 'comment', id: number, status: string, note: string, adminUsername: string, hiddenReason = ''): SqlRow | undefined => {
  const now = new Date().toISOString();
  if (target === 'record') {
    db.prepare(
      `
        UPDATE slacking_records
        SET status = ?,
            review_note = ?,
            reviewed_by = ?,
            reviewed_at = ?,
            hidden_reason = ?,
            updated_at = ?
        WHERE id = ?
      `
    ).run(status, note, adminUsername, now, hiddenReason, now, id);
    refreshAllSocialAggregates();
    return db.prepare('SELECT slacking_records.*, users.username FROM slacking_records LEFT JOIN users ON users.id = slacking_records.user_id WHERE slacking_records.id = ?').get(id) as SqlRow | undefined;
  }

  const before = db.prepare('SELECT * FROM comments WHERE id = ?').get(id) as SqlRow | undefined;
  db.prepare(
    `
      UPDATE comments
      SET status = ?,
          review_note = ?,
          reviewed_by = ?,
          reviewed_at = ?,
          updated_at = ?
      WHERE id = ?
    `
  ).run(status, note, adminUsername, now, id);
  if (before && status === 'approved' && String(before.status) !== 'approved') {
    const record = db.prepare('SELECT user_id FROM slacking_records WHERE id = ?').get(Number(before.record_id)) as { user_id: number | null } | undefined;
    const commentAuthorId = Number(before.user_id ?? 0);
    if (record?.user_id && Number(record.user_id) !== commentAuthorId) {
      grantInteractionFishScale({
        userId: Number(record.user_id),
        amount: 2,
        reason: 'record_commented',
        relatedType: 'comment',
        relatedId: id
      });
    }
  }
  if (before) refreshRecordInteractionCounts(Number(before.record_id));
  return db.prepare('SELECT comments.*, users.username FROM comments LEFT JOIN users ON users.id = comments.user_id WHERE comments.id = ?').get(id) as SqlRow | undefined;
};

export const registerAdminRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post('/api/admin/auth/login', async (request, reply) => {
    if (!ensureAdminConfigured(reply)) return;
    const parsed = adminLoginSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: '登录信息无效。' });

    const valid = await verifyAdminCredentials(parsed.data.username, parsed.data.password);
    if (!valid) return reply.code(401).send({ message: '管理员账号或密码不正确。' });

    const token = createAdminSessionToken(parsed.data.username);
    setAdminCookie(reply, token);
    writeAdminAuditLog(request, {
      adminUsername: parsed.data.username,
      action: 'login',
      targetType: 'admin_session',
      targetId: parsed.data.username
    });
    return { user: { username: parsed.data.username }, expiresIn: 60 * 60 * 8 };
  });

  app.post('/api/admin/auth/logout', async (request, reply) => {
    const session = getAdminSession(request);
    clearAdminCookie(reply);
    if (session) {
      writeAdminAuditLog(request, {
        adminUsername: session.username,
        action: 'logout',
        targetType: 'admin_session',
        targetId: session.username
      });
    }
    return { ok: true };
  });

  app.get('/api/admin/auth/me', async (request, reply) => {
    if (!ensureAdminConfigured(reply)) return;
    const session = requireAdminSession(request, reply);
    if (!session) return;
    return { user: { username: session.username }, expiresAt: session.expiresAt };
  });

  app.get('/api/admin/dashboard/summary', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const today = getTodayRange();
    const recentPending = db
      .prepare("SELECT slacking_records.*, users.username FROM slacking_records LEFT JOIN users ON users.id = slacking_records.user_id WHERE slacking_records.status = 'pending' ORDER BY slacking_records.created_at DESC LIMIT 6")
      .all() as SqlRow[];
    const reports = db
      .prepare(
        `
          SELECT reports.*, users.username, users.display_name
          FROM reports
          LEFT JOIN users ON users.id = reports.user_id
          WHERE reports.status IN ('pending', 'reviewing')
          ORDER BY reports.created_at DESC
          LIMIT 6
        `
      )
      .all() as SqlRow[];
    const auditLogs = db.prepare('SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 8').all() as SqlRow[];

    return {
      summary: {
        todayRecords: count('SELECT COUNT(*) AS count FROM slacking_records WHERE created_at >= ? AND created_at < ?', today.start, today.end),
        todayComments: count('SELECT COUNT(*) AS count FROM comments WHERE created_at >= ? AND created_at < ?', today.start, today.end),
        pendingRecords: count("SELECT COUNT(*) AS count FROM slacking_records WHERE status = 'pending'"),
        pendingReports: count("SELECT COUNT(*) AS count FROM reports WHERE status IN ('pending', 'reviewing')"),
        hiddenContent: count(`SELECT COUNT(*) AS count FROM slacking_records WHERE ${hiddenSql}`) + count(`SELECT COUNT(*) AS count FROM comments WHERE ${hiddenSql}`),
        totalUsers: count('SELECT COUNT(*) AS count FROM users'),
        totalRecords: count('SELECT COUNT(*) AS count FROM slacking_records'),
        totalComments: count('SELECT COUNT(*) AS count FROM comments'),
        totalGuilds: count('SELECT COUNT(*) AS count FROM guilds'),
        totalCircles: count('SELECT COUNT(*) AS count FROM circles'),
        totalGroups: count('SELECT COUNT(*) AS count FROM "groups"'),
        totalInteractions:
          count('SELECT COUNT(*) AS count FROM record_interactions') +
          count('SELECT COUNT(*) AS count FROM reactions') +
          count('SELECT COUNT(*) AS count FROM comments')
      },
      latestPendingRecords: recentPending.map(adminRecord),
      latestReports: reports.map(adminReport),
      recentAuditLogs: auditLogs.map(adminAudit),
      viewer: { username: session.username }
    };
  });

  app.get('/api/admin/review-queue', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const records = db
      .prepare("SELECT slacking_records.*, users.username FROM slacking_records LEFT JOIN users ON users.id = slacking_records.user_id WHERE slacking_records.status = 'pending' ORDER BY slacking_records.created_at ASC LIMIT 50")
      .all() as SqlRow[];
    const comments = db
      .prepare("SELECT comments.*, users.username FROM comments LEFT JOIN users ON users.id = comments.user_id WHERE comments.status = 'pending' ORDER BY comments.created_at ASC LIMIT 50")
      .all() as SqlRow[];
    return { records: records.map(adminRecord), comments: comments.map(adminComment) };
  });

  app.get('/api/admin/records', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const parsed = recordQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: '记录筛选参数无效。' });
    const where: string[] = [];
    const params: SqlParam[] = [];

    if (parsed.data.status !== 'all') {
      if (parsed.data.status === 'published') {
        where.push(`slacking_records.${publishedSql}`);
      } else {
        where.push('slacking_records.status = ?');
        params.push(adminToDbStatus(parsed.data.status));
      }
    }
    if (parsed.data.keyword) {
      where.push('(slacking_records.nickname LIKE ? OR users.username LIKE ? OR slacking_records.activity_text LIKE ? OR slacking_records.description LIKE ?)');
      const keyword = `%${parsed.data.keyword}%`;
      params.push(keyword, keyword, keyword, keyword);
    }
    if (parsed.data.date_from) {
      where.push('slacking_records.created_at >= ?');
      params.push(parsed.data.date_from);
    }
    if (parsed.data.date_to) {
      where.push('slacking_records.created_at <= ?');
      params.push(parsed.data.date_to);
    }
    if (parsed.data.min_score !== undefined) {
      where.push('slacking_records.fish_power_score >= ?');
      params.push(parsed.data.min_score);
    }
    if (parsed.data.max_score !== undefined) {
      where.push('slacking_records.fish_power_score <= ?');
      params.push(parsed.data.max_score);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const baseSql = `
      SELECT slacking_records.*, users.username
      FROM slacking_records
      LEFT JOIN users ON users.id = slacking_records.user_id
      ${whereSql}
      ORDER BY slacking_records.created_at DESC
    `;
    const countSql = `
      SELECT COUNT(*) AS count
      FROM slacking_records
      LEFT JOIN users ON users.id = slacking_records.user_id
      ${whereSql}
    `;
    const result = runPaged(baseSql, countSql, params, parsed.data.page, parsed.data.page_size);
    return { records: result.rows.map(adminRecord), total: result.total, page: parsed.data.page, pageSize: parsed.data.page_size };
  });

  app.get('/api/admin/records/:id', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '记录 ID 无效。' });
    const row = db
      .prepare('SELECT slacking_records.*, users.username FROM slacking_records LEFT JOIN users ON users.id = slacking_records.user_id WHERE slacking_records.id = ?')
      .get(params.data.id) as SqlRow | undefined;
    if (!row) return reply.code(404).send({ message: '记录不存在。' });
    const reports = db
      .prepare('SELECT reports.*, users.username, users.display_name FROM reports LEFT JOIN users ON users.id = reports.user_id WHERE reports.target_type = ? AND reports.target_id = ? ORDER BY reports.created_at DESC')
      .all('record', params.data.id) as SqlRow[];
    const comments = db
      .prepare('SELECT comments.*, users.username FROM comments LEFT JOIN users ON users.id = comments.user_id WHERE comments.record_id = ? ORDER BY comments.created_at DESC')
      .all(params.data.id) as SqlRow[];
    const circles = db
      .prepare('SELECT circles.id, circles.name, circles.slug FROM record_circles JOIN circles ON circles.id = record_circles.circle_id WHERE record_circles.record_id = ? ORDER BY circles.id ASC')
      .all(params.data.id) as SqlRow[];
    const topics = db
      .prepare('SELECT topics.id, topics.name, topics.slug, topics.usage_count, topics.status FROM record_topics JOIN topics ON topics.id = record_topics.topic_id WHERE record_topics.record_id = ? ORDER BY record_topics.id ASC')
      .all(params.data.id) as SqlRow[];
    const groups = db
      .prepare('SELECT "groups".id, "groups".name, "groups".visibility FROM record_groups JOIN "groups" ON "groups".id = record_groups.group_id WHERE record_groups.record_id = ? ORDER BY "groups".id ASC')
      .all(params.data.id) as SqlRow[];
    const guild = row.guild_id
      ? (db.prepare('SELECT id, name, slug FROM guilds WHERE id = ?').get(Number(row.guild_id)) as SqlRow | undefined)
      : null;
    const auditLogs = db
      .prepare("SELECT * FROM admin_audit_logs WHERE target_type = 'record' AND target_id = ? ORDER BY created_at DESC LIMIT 20")
      .all(String(params.data.id)) as SqlRow[];
    return {
      record: adminRecord(row),
      reports: reports.map(adminReport),
      comments: comments.map(adminComment),
      guild,
      circles,
      topics: topics.map(adminTopic),
      groups,
      auditLogs: auditLogs.map(adminAudit)
    };
  });

  app.patch('/api/admin/records/:id/status', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = recordStatusSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '审核参数无效。' });
    const before = db.prepare('SELECT * FROM slacking_records WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!before) return reply.code(404).send({ message: '记录不存在。' });
    const status = actionToDbStatus(parsed.data.action);
    const after = updateStatus('record', params.data.id, status, parsed.data.reviewNote, session.username, parsed.data.hiddenReason);
    writeAdminAuditLog(request, {
      adminUsername: session.username,
      action: `record_${parsed.data.action}`,
      targetType: 'record',
      targetId: params.data.id,
      before,
      after
    });
    return { record: after ? adminRecord(after) : null };
  });

  app.patch('/api/admin/records/:id/review', async (request, reply) => {
    const parsed = z
      .object({ status: z.enum(['approved', 'published', 'pending', 'hidden', 'rejected']), reviewNote: z.string().trim().max(240).default('') })
      .safeParse(request.body);
    const params = idParamSchema.safeParse(request.params);
    const session = requireAdminSession(request, reply);
    if (!session) return;
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '审核参数无效。' });
    const before = db.prepare('SELECT * FROM slacking_records WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!before) return reply.code(404).send({ message: '记录不存在。' });
    const after = updateStatus('record', params.data.id, adminToDbStatus(parsed.data.status), parsed.data.reviewNote, session.username);
    writeAdminAuditLog(request, {
      adminUsername: session.username,
      action: 'record_review',
      targetType: 'record',
      targetId: params.data.id,
      before,
      after
    });
    return { record: after ? adminRecord(after) : null };
  });

  app.patch('/api/admin/records/:id/legend', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = legendSelectedSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '传奇记录参数无效。' });
    const before = db.prepare('SELECT * FROM slacking_records WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!before) return reply.code(404).send({ message: '记录不存在。' });
    const now = new Date().toISOString();
    db.prepare('UPDATE slacking_records SET legend_selected = ?, updated_at = ? WHERE id = ?').run(parsed.data.selected ? 1 : 0, now, params.data.id);
    if (parsed.data.selected && !Boolean(before.legend_selected)) {
      grantLegendSelectedFishScale(params.data.id);
    }
    refreshRecordInteractionCounts(params.data.id);
    const after = db.prepare('SELECT * FROM slacking_records WHERE id = ?').get(params.data.id) as SqlRow;
    writeAdminAuditLog(request, {
      adminUsername: session.username,
      action: parsed.data.selected ? 'record_legend_select' : 'record_legend_unselect',
      targetType: 'record',
      targetId: params.data.id,
      before,
      after
    });
    return { record: adminRecord(after) };
  });

  app.patch('/api/admin/records/:id', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = recordPatchSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '记录参数无效。' });
    const before = db.prepare('SELECT * FROM slacking_records WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!before) return reply.code(404).send({ message: '记录不存在。' });
    const reviewNote = parsed.data.reviewNote ?? String(before.review_note ?? '');
    const hiddenReason = parsed.data.hiddenReason ?? String(before.hidden_reason ?? '');
    const visibility = parsed.data.visibility ?? String(before.visibility ?? 'public');
    db.prepare('UPDATE slacking_records SET review_note = ?, hidden_reason = ?, visibility = ?, updated_at = ? WHERE id = ?').run(
      reviewNote,
      hiddenReason,
      visibility,
      new Date().toISOString(),
      params.data.id
    );
    const after = db.prepare('SELECT * FROM slacking_records WHERE id = ?').get(params.data.id) as SqlRow;
    writeAdminAuditLog(request, {
      adminUsername: session.username,
      action: 'record_update',
      targetType: 'record',
      targetId: params.data.id,
      before,
      after
    });
    return { record: adminRecord(after) };
  });

  app.delete('/api/admin/records/:id', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '记录 ID 无效。' });
    const before = db.prepare('SELECT * FROM slacking_records WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!before) return reply.code(404).send({ message: '记录不存在。' });
    const after = updateStatus('record', params.data.id, 'rejected', '管理员删除记录', session.username, '管理员删除记录');
    writeAdminAuditLog(request, {
      adminUsername: session.username,
      action: 'record_delete',
      targetType: 'record',
      targetId: params.data.id,
      before,
      after
    });
    return { ok: true, record: after ? adminRecord(after) : null };
  });

  app.get('/api/admin/reports', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const parsed = reportQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: '举报筛选参数无效。' });
    const where: string[] = [];
    const params: SqlParam[] = [];
    if (parsed.data.status !== 'all') {
      where.push('reports.status = ?');
      params.push(parsed.data.status);
    }
    if (parsed.data.target_type !== 'all') {
      where.push('reports.target_type = ?');
      params.push(parsed.data.target_type);
    }
    if (parsed.data.keyword) {
      where.push('(reports.reason LIKE ? OR users.username LIKE ? OR users.display_name LIKE ?)');
      const keyword = `%${parsed.data.keyword}%`;
      params.push(keyword, keyword, keyword);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const baseSql = `
      SELECT reports.*, users.username, users.display_name
      FROM reports
      LEFT JOIN users ON users.id = reports.user_id
      ${whereSql}
      ORDER BY reports.created_at DESC
    `;
    const countSql = `
      SELECT COUNT(*) AS count
      FROM reports
      LEFT JOIN users ON users.id = reports.user_id
      ${whereSql}
    `;
    const result = runPaged(baseSql, countSql, params, parsed.data.page, parsed.data.page_size);
    return { reports: result.rows.map(adminReport), total: result.total, page: parsed.data.page, pageSize: parsed.data.page_size };
  });

  app.get('/api/admin/reports/:id', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '举报 ID 无效。' });
    const report = db
      .prepare('SELECT reports.*, users.username, users.display_name FROM reports LEFT JOIN users ON users.id = reports.user_id WHERE reports.id = ?')
      .get(params.data.id) as SqlRow | undefined;
    if (!report) return reply.code(404).send({ message: '举报不存在。' });
    let target: unknown = null;
    if (report.target_type === 'record') {
      const row = db.prepare('SELECT * FROM slacking_records WHERE id = ?').get(Number(report.target_id)) as SqlRow | undefined;
      target = row ? adminRecord(row) : null;
    }
    if (report.target_type === 'comment') {
      const row = db.prepare('SELECT * FROM comments WHERE id = ?').get(Number(report.target_id)) as SqlRow | undefined;
      target = row ? adminComment(row) : null;
    }
    return { report: adminReport(report), target };
  });

  app.patch('/api/admin/reports/:id/status', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = reportStatusSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '举报处理参数无效。' });
    const before = db.prepare('SELECT * FROM reports WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!before) return reply.code(404).send({ message: '举报不存在。' });
    const now = new Date().toISOString();
    db.prepare('UPDATE reports SET status = ?, admin_note = ?, resolved_by = ?, resolved_at = ? WHERE id = ?').run(
      parsed.data.status,
      parsed.data.adminNote,
      ['resolved', 'rejected'].includes(parsed.data.status) ? session.username : '',
      ['resolved', 'rejected'].includes(parsed.data.status) ? now : '',
      params.data.id
    );
    if (parsed.data.hideTarget) {
      if (before.target_type === 'record') updateStatus('record', Number(before.target_id), 'hidden', parsed.data.adminNote, session.username, '举报联动隐藏');
      if (before.target_type === 'comment') updateStatus('comment', Number(before.target_id), 'hidden', parsed.data.adminNote, session.username);
    }
    const after = db.prepare('SELECT * FROM reports WHERE id = ?').get(params.data.id) as SqlRow;
    writeAdminAuditLog(request, {
      adminUsername: session.username,
      action: 'report_status',
      targetType: 'report',
      targetId: params.data.id,
      before,
      after
    });
    return { report: adminReport(after) };
  });

  app.get('/api/admin/comments', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const parsed = commentsQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: '评论筛选参数无效。' });
    const where: string[] = [];
    const params: SqlParam[] = [];
    if (parsed.data.status !== 'all') {
      if (parsed.data.status === 'published') {
        where.push(`comments.${publishedSql}`);
      } else {
        where.push('comments.status = ?');
        params.push(adminToDbStatus(parsed.data.status));
      }
    }
    if (parsed.data.keyword) {
      where.push('(comments.content LIKE ? OR comments.nickname LIKE ? OR users.username LIKE ?)');
      const keyword = `%${parsed.data.keyword}%`;
      params.push(keyword, keyword, keyword);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const baseSql = `
      SELECT comments.*, users.username
      FROM comments
      LEFT JOIN users ON users.id = comments.user_id
      ${whereSql}
      ORDER BY comments.created_at DESC
    `;
    const countSql = `
      SELECT COUNT(*) AS count
      FROM comments
      LEFT JOIN users ON users.id = comments.user_id
      ${whereSql}
    `;
    const result = runPaged(baseSql, countSql, params, parsed.data.page, parsed.data.page_size);
    return { comments: result.rows.map(adminComment), total: result.total, page: parsed.data.page, pageSize: parsed.data.page_size };
  });

  app.patch('/api/admin/comments/:id/status', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = commentStatusSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '评论处理参数无效。' });
    const before = db.prepare('SELECT * FROM comments WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!before) return reply.code(404).send({ message: '评论不存在。' });
    const after = updateStatus('comment', params.data.id, actionToDbStatus(parsed.data.action), parsed.data.reviewNote, session.username);
    writeAdminAuditLog(request, {
      adminUsername: session.username,
      action: `comment_${parsed.data.action}`,
      targetType: 'comment',
      targetId: params.data.id,
      before,
      after
    });
    return { comment: after ? adminComment(after) : null };
  });

  app.patch('/api/admin/comments/:id/review', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = z
      .object({ status: z.enum(['approved', 'published', 'pending', 'hidden', 'rejected']), reviewNote: z.string().trim().max(240).default('') })
      .safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '评论审核参数无效。' });
    const before = db.prepare('SELECT * FROM comments WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!before) return reply.code(404).send({ message: '评论不存在。' });
    const after = updateStatus('comment', params.data.id, adminToDbStatus(parsed.data.status), parsed.data.reviewNote, session.username);
    writeAdminAuditLog(request, {
      adminUsername: session.username,
      action: 'comment_review',
      targetType: 'comment',
      targetId: params.data.id,
      before,
      after
    });
    return { comments: before.record_id ? [after].filter(Boolean).map((row) => adminComment(row as SqlRow)) : [] };
  });

  app.delete('/api/admin/comments/:id', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '评论 ID 无效。' });
    const before = db.prepare('SELECT * FROM comments WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!before) return reply.code(404).send({ message: '评论不存在。' });
    const after = updateStatus('comment', params.data.id, 'hidden', '管理员删除评论', session.username);
    writeAdminAuditLog(request, {
      adminUsername: session.username,
      action: 'comment_delete',
      targetType: 'comment',
      targetId: params.data.id,
      before,
      after
    });
    return { ok: true };
  });

  app.get('/api/admin/topics', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const parsed = topicQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: '话题筛选参数无效。' });
    const where: string[] = [];
    const params: SqlParam[] = [];
    if (parsed.data.status !== 'all') {
      where.push('status = ?');
      params.push(parsed.data.status);
    }
    if (parsed.data.keyword) {
      where.push('(name LIKE ? OR slug LIKE ?)');
      const keyword = `%${parsed.data.keyword}%`;
      params.push(keyword, keyword);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const result = runPaged(
      `SELECT * FROM topics ${whereSql} ORDER BY usage_count DESC, updated_at DESC, id ASC`,
      `SELECT COUNT(*) AS count FROM topics ${whereSql}`,
      params,
      parsed.data.page,
      parsed.data.page_size
    );
    return { topics: result.rows.map(adminTopic), total: result.total, page: parsed.data.page, pageSize: parsed.data.page_size };
  });

  app.get('/api/admin/topics/:id/records', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '话题 ID 无效。' });
    const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!topic) return reply.code(404).send({ message: '话题不存在。' });
    const records = db
      .prepare(
        `
          SELECT slacking_records.*, users.username
          FROM record_topics
          JOIN slacking_records ON slacking_records.id = record_topics.record_id
          LEFT JOIN users ON users.id = slacking_records.user_id
          WHERE record_topics.topic_id = ?
          ORDER BY slacking_records.created_at DESC
          LIMIT 50
        `
      )
      .all(params.data.id) as SqlRow[];
    return { topic: adminTopic(topic), records: records.map(adminRecord) };
  });

  app.patch('/api/admin/topics/:id', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = topicPatchSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '话题参数无效。' });
    const before = db.prepare('SELECT * FROM topics WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!before) return reply.code(404).send({ message: '话题不存在。' });
    const validation = validateTopicName(parsed.data.name, enabledSensitiveWords());
    if (!validation.ok) return reply.code(400).send({ message: validation.message });
    const duplicate = db
      .prepare('SELECT id FROM topics WHERE lower(name) = lower(?) AND id != ? LIMIT 1')
      .get(validation.name, params.data.id);
    if (duplicate) return reply.code(409).send({ message: '话题名称已存在。' });
    const slug = makeUniqueTopicSlug(validation.name, params.data.id);
    db.prepare('UPDATE topics SET name = ?, slug = ?, updated_at = ? WHERE id = ?').run(
      normalizeTopicName(validation.name),
      slug,
      new Date().toISOString(),
      params.data.id
    );
    const after = db.prepare('SELECT * FROM topics WHERE id = ?').get(params.data.id) as SqlRow;
    writeAdminAuditLog(request, {
      adminUsername: session.username,
      action: 'topic_update',
      targetType: 'topic',
      targetId: params.data.id,
      before,
      after
    });
    return { topic: adminTopic(after) };
  });

  app.patch('/api/admin/topics/:id/status', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = topicStatusSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '话题状态无效。' });
    const before = db.prepare('SELECT * FROM topics WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!before) return reply.code(404).send({ message: '话题不存在。' });
    db.prepare('UPDATE topics SET status = ?, updated_at = ? WHERE id = ?').run(parsed.data.status, new Date().toISOString(), params.data.id);
    const after = db.prepare('SELECT * FROM topics WHERE id = ?').get(params.data.id) as SqlRow;
    writeAdminAuditLog(request, {
      adminUsername: session.username,
      action: 'topic_status',
      targetType: 'topic',
      targetId: params.data.id,
      before,
      after
    });
    return { topic: adminTopic(after) };
  });

  app.get('/api/admin/users', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const parsed = pageQuerySchema.extend({ keyword: z.string().trim().max(80).default('') }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: '用户筛选参数无效。' });
    const keyword = parsed.data.keyword ? `%${parsed.data.keyword}%` : '';
    const whereSql = keyword ? 'WHERE users.username LIKE ? OR users.display_name LIKE ?' : '';
    const params = keyword ? [keyword, keyword] : [];
    const baseSql = `
      SELECT
        users.*,
        COUNT(slacking_records.id) AS record_count,
        COALESCE(SUM(slacking_records.fish_power_score), 0) AS total_score,
        COALESCE(SUM(slacking_records.report_count), 0) AS report_count
      FROM users
      LEFT JOIN slacking_records ON slacking_records.user_id = users.id
      ${whereSql}
      GROUP BY users.id
      ORDER BY users.created_at DESC
    `;
    const countSql = `SELECT COUNT(*) AS count FROM users ${whereSql}`;
    const result = runPaged(baseSql, countSql, params, parsed.data.page, parsed.data.page_size);
    return {
      users: result.rows.map((row) => ({
        id: Number(row.id),
        username: String(row.username),
        displayName: String(row.display_name),
        status: String(row.status ?? 'active'),
        muteUntil: String(row.mute_until ?? ''),
        banReason: String(row.ban_reason ?? ''),
        isAdmin: Boolean(row.is_admin),
        recordCount: Number(row.record_count ?? 0),
        totalScore: Number(row.total_score ?? 0),
        reportCount: Number(row.report_count ?? 0),
        createdAt: String(row.created_at ?? ''),
        updatedAt: String(row.updated_at ?? '')
      })),
      total: result.total,
      page: parsed.data.page,
      pageSize: parsed.data.page_size
    };
  });

  app.get('/api/admin/users/:id', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '用户 ID 无效。' });
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!user) return reply.code(404).send({ message: '用户不存在。' });
    const records = db.prepare('SELECT * FROM slacking_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(params.data.id) as SqlRow[];
    return { user, records: records.map(adminRecord) };
  });

  app.patch('/api/admin/users/:id/status', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = userStatusSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '用户状态参数无效。' });
    const before = db.prepare('SELECT * FROM users WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!before) return reply.code(404).send({ message: '用户不存在。' });
    db.prepare('UPDATE users SET status = ?, mute_until = ?, ban_reason = ?, updated_at = ? WHERE id = ?').run(
      parsed.data.status,
      parsed.data.muteUntil,
      parsed.data.banReason,
      new Date().toISOString(),
      params.data.id
    );
    const after = db.prepare('SELECT * FROM users WHERE id = ?').get(params.data.id) as SqlRow;
    writeAdminAuditLog(request, {
      adminUsername: session.username,
      action: 'user_status',
      targetType: 'user',
      targetId: params.data.id,
      before,
      after
    });
    return { user: after };
  });

  app.get('/api/admin/wallets', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const parsed = walletQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: '钱包筛选参数无效。' });
    const keyword = parsed.data.keyword ? `%${parsed.data.keyword}%` : '';
    const whereSql = keyword ? 'WHERE users.username LIKE ? OR users.display_name LIKE ?' : '';
    const params = keyword ? [keyword, keyword] : [];
    const result = runPaged(
      `
        SELECT
          users.id AS user_id,
          users.username,
          users.display_name,
          COALESCE(user_wallets.fish_scale_balance, 0) AS fish_scale_balance,
          COALESCE(user_wallets.fish_scale_total_earned, 0) AS fish_scale_total_earned,
          COALESCE(user_wallets.fish_scale_total_spent, 0) AS fish_scale_total_spent,
          COALESCE(user_wallets.created_at, users.created_at) AS created_at,
          COALESCE(user_wallets.updated_at, users.updated_at) AS updated_at
        FROM users
        LEFT JOIN user_wallets ON user_wallets.user_id = users.id
        ${whereSql}
        ORDER BY fish_scale_balance DESC, users.created_at DESC
      `,
      `SELECT COUNT(*) AS count FROM users ${whereSql}`,
      params,
      parsed.data.page,
      parsed.data.page_size
    );
    return { wallets: result.rows.map(adminWallet), total: result.total, page: parsed.data.page, pageSize: parsed.data.page_size };
  });

  app.post('/api/admin/wallets/:id/adjust', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = walletAdjustmentSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '鱼鳞调整参数无效。' });
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!user) return reply.code(404).send({ message: '用户不存在。' });
    const before = getFishScaleWallet(params.data.id);
    try {
      const result = adjustFishScale({
        userId: params.data.id,
        amount: parsed.data.amount,
        reason: `admin_adjustment:${parsed.data.reason}`,
        relatedType: 'admin',
        relatedId: null
      });
      writeAdminAuditLog(request, {
        adminUsername: session.username,
        action: 'fish_scale_adjust',
        targetType: 'wallet',
        targetId: params.data.id,
        before,
        after: result.wallet
      });
      return { wallet: result.wallet, transaction: result.transaction };
    } catch (error) {
      if (error instanceof Error && error.message === FISH_SCALE_INSUFFICIENT_MESSAGE) {
        return reply.code(400).send({ message: FISH_SCALE_INSUFFICIENT_MESSAGE });
      }
      throw error;
    }
  });

  app.get('/api/admin/transactions', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const parsed = transactionQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: '鱼鳞流水筛选参数无效。' });
    const where: string[] = [];
    const params: SqlParam[] = [];
    if (parsed.data.type) {
      where.push('fish_scale_transactions.type = ?');
      params.push(parsed.data.type);
    }
    if (parsed.data.keyword) {
      where.push('(users.username LIKE ? OR users.display_name LIKE ? OR fish_scale_transactions.reason LIKE ? OR fish_scale_transactions.related_type LIKE ?)');
      const keyword = `%${parsed.data.keyword}%`;
      params.push(keyword, keyword, keyword, keyword);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const result = runPaged(
      `
        SELECT fish_scale_transactions.*, users.username, users.display_name
        FROM fish_scale_transactions
        LEFT JOIN users ON users.id = fish_scale_transactions.user_id
        ${whereSql}
        ORDER BY fish_scale_transactions.created_at DESC, fish_scale_transactions.id DESC
      `,
      `
        SELECT COUNT(*) AS count
        FROM fish_scale_transactions
        LEFT JOIN users ON users.id = fish_scale_transactions.user_id
        ${whereSql}
      `,
      params,
      parsed.data.page,
      parsed.data.page_size
    );
    return { transactions: result.rows.map(adminFishScaleTransaction), total: result.total, page: parsed.data.page, pageSize: parsed.data.page_size };
  });

  app.get('/api/admin/guilds', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const rows = db.prepare('SELECT * FROM guilds ORDER BY created_at DESC').all() as SqlRow[];
    return {
      guilds: rows.map((row) => ({
        id: Number(row.id),
        name: String(row.name),
        slug: String(row.slug),
        description: String(row.description),
        icon: String(row.icon),
        status: String(row.status ?? 'active'),
        totalContribution: Number(row.total_contribution ?? 0),
        memberCount: Number(row.member_count ?? 0),
        level: getGuildLevel(Number(row.total_contribution ?? 0)),
        createdAt: String(row.created_at ?? ''),
        updatedAt: String(row.updated_at ?? '')
      }))
    };
  });

  app.post('/api/admin/guilds', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const parsed = entitySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: '工会信息无效。' });
    if (rejectUnsafeEntity(`${parsed.data.name} ${parsed.data.description}`)) return reply.code(400).send({ message: '工会信息疑似包含未匿名化敏感内容。' });
    const now = new Date().toISOString();
    const result = db
      .prepare('INSERT INTO guilds (name, slug, description, icon, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(parsed.data.name, uniqueSlug('guild', 'guilds'), parsed.data.description, parsed.data.icon, 'active', now, now);
    const after = db.prepare('SELECT * FROM guilds WHERE id = ?').get(result.lastInsertRowid) as SqlRow;
    writeAdminAuditLog(request, {
      adminUsername: session.username,
      action: 'guild_create',
      targetType: 'guild',
      targetId: Number(result.lastInsertRowid),
      after
    });
    return reply.code(201).send({ guild: after });
  });

  app.patch('/api/admin/guilds/:id', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = entityPatchSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '工会信息无效。' });
    const before = db.prepare('SELECT * FROM guilds WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!before) return reply.code(404).send({ message: '工会不存在。' });
    const name = parsed.data.name ?? String(before.name);
    const description = parsed.data.description ?? String(before.description);
    if (rejectUnsafeEntity(`${name} ${description}`)) return reply.code(400).send({ message: '工会信息疑似包含未匿名化敏感内容。' });
    db.prepare('UPDATE guilds SET name = ?, description = ?, icon = ?, updated_at = ? WHERE id = ?').run(
      name,
      description,
      parsed.data.icon ?? String(before.icon),
      new Date().toISOString(),
      params.data.id
    );
    const after = db.prepare('SELECT * FROM guilds WHERE id = ?').get(params.data.id) as SqlRow;
    writeAdminAuditLog(request, { adminUsername: session.username, action: 'guild_update', targetType: 'guild', targetId: params.data.id, before, after });
    return { guild: after };
  });

  app.patch('/api/admin/guilds/:id/status', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = entityStatusSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '工会状态无效。' });
    const before = db.prepare('SELECT * FROM guilds WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!before) return reply.code(404).send({ message: '工会不存在。' });
    db.prepare('UPDATE guilds SET status = ?, updated_at = ? WHERE id = ?').run(parsed.data.status, new Date().toISOString(), params.data.id);
    const after = db.prepare('SELECT * FROM guilds WHERE id = ?').get(params.data.id) as SqlRow;
    writeAdminAuditLog(request, { adminUsername: session.username, action: 'guild_status', targetType: 'guild', targetId: params.data.id, before, after });
    return { guild: after };
  });

  app.get('/api/admin/circles', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const rows = db.prepare('SELECT * FROM circles ORDER BY created_at DESC').all() as SqlRow[];
    return {
      circles: rows.map((row) => ({
        id: Number(row.id),
        name: String(row.name),
        slug: String(row.slug),
        description: String(row.description),
        icon: String(row.icon),
        status: String(row.status ?? 'active'),
        memberCount: Number(row.member_count ?? 0),
        recordCount: Number(row.record_count ?? 0),
        boards: CIRCLE_FEATURED_BOARDS[String(row.slug)] ?? [],
        createdAt: String(row.created_at ?? ''),
        updatedAt: String(row.updated_at ?? '')
      }))
    };
  });

  app.post('/api/admin/circles', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const parsed = entitySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: '圈子信息无效。' });
    if (rejectUnsafeEntity(`${parsed.data.name} ${parsed.data.description}`)) return reply.code(400).send({ message: '圈子信息疑似包含未匿名化敏感内容。' });
    const now = new Date().toISOString();
    const result = db
      .prepare('INSERT INTO circles (name, slug, description, icon, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(parsed.data.name, uniqueSlug('circle', 'circles'), parsed.data.description, parsed.data.icon, 'active', now, now);
    const after = db.prepare('SELECT * FROM circles WHERE id = ?').get(result.lastInsertRowid) as SqlRow;
    writeAdminAuditLog(request, { adminUsername: session.username, action: 'circle_create', targetType: 'circle', targetId: Number(result.lastInsertRowid), after });
    return reply.code(201).send({ circle: after });
  });

  app.patch('/api/admin/circles/:id', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = entityPatchSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '圈子信息无效。' });
    const before = db.prepare('SELECT * FROM circles WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!before) return reply.code(404).send({ message: '圈子不存在。' });
    const name = parsed.data.name ?? String(before.name);
    const description = parsed.data.description ?? String(before.description);
    if (rejectUnsafeEntity(`${name} ${description}`)) return reply.code(400).send({ message: '圈子信息疑似包含未匿名化敏感内容。' });
    db.prepare('UPDATE circles SET name = ?, description = ?, icon = ?, updated_at = ? WHERE id = ?').run(
      name,
      description,
      parsed.data.icon ?? String(before.icon),
      new Date().toISOString(),
      params.data.id
    );
    const after = db.prepare('SELECT * FROM circles WHERE id = ?').get(params.data.id) as SqlRow;
    writeAdminAuditLog(request, { adminUsername: session.username, action: 'circle_update', targetType: 'circle', targetId: params.data.id, before, after });
    return { circle: after };
  });

  app.patch('/api/admin/circles/:id/status', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = entityStatusSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '圈子状态无效。' });
    const before = db.prepare('SELECT * FROM circles WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!before) return reply.code(404).send({ message: '圈子不存在。' });
    db.prepare('UPDATE circles SET status = ?, updated_at = ? WHERE id = ?').run(parsed.data.status, new Date().toISOString(), params.data.id);
    const after = db.prepare('SELECT * FROM circles WHERE id = ?').get(params.data.id) as SqlRow;
    writeAdminAuditLog(request, { adminUsername: session.username, action: 'circle_status', targetType: 'circle', targetId: params.data.id, before, after });
    return { circle: after };
  });

  app.get('/api/admin/groups', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const rows = db
      .prepare('SELECT "groups".*, users.username, users.display_name FROM "groups" LEFT JOIN users ON users.id = "groups".owner_user_id ORDER BY "groups".created_at DESC')
      .all() as SqlRow[];
    return {
      groups: rows.map((row) => ({
        id: Number(row.id),
        name: String(row.name),
        description: String(row.description ?? ''),
        visibility: String(row.visibility ?? 'public'),
        status: String(row.status ?? 'active'),
        ownerUserId: Number(row.owner_user_id),
        ownerUsername: String(row.username ?? ''),
        ownerNickname: String(row.display_name ?? ''),
        memberCount: Number(row.member_count ?? 0),
        createdAt: String(row.created_at ?? ''),
        updatedAt: String(row.updated_at ?? '')
      }))
    };
  });

  app.get('/api/admin/groups/:id', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: '小组 ID 无效。' });
    const group = db.prepare('SELECT * FROM "groups" WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!group) return reply.code(404).send({ message: '小组不存在。' });
    const members = db
      .prepare('SELECT users.id, users.username, users.display_name, group_members.role, group_members.nickname_title FROM group_members JOIN users ON users.id = group_members.user_id WHERE group_members.group_id = ? ORDER BY group_members.joined_at ASC')
      .all(params.data.id) as SqlRow[];
    return { group, members };
  });

  app.patch('/api/admin/groups/:id/status', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = entityStatusSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: '小组状态无效。' });
    const before = db.prepare('SELECT * FROM "groups" WHERE id = ?').get(params.data.id) as SqlRow | undefined;
    if (!before) return reply.code(404).send({ message: '小组不存在。' });
    db.prepare('UPDATE "groups" SET status = ?, updated_at = ? WHERE id = ?').run(parsed.data.status, new Date().toISOString(), params.data.id);
    const after = db.prepare('SELECT * FROM "groups" WHERE id = ?').get(params.data.id) as SqlRow;
    writeAdminAuditLog(request, { adminUsername: session.username, action: 'group_status', targetType: 'group', targetId: params.data.id, before, after });
    return { group: after };
  });

  app.get('/api/admin/safety/flags', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const records = db
        .prepare("SELECT id, nickname, activity_text, activity_tags, description, status, review_note, sensitive_flags, created_at FROM slacking_records WHERE status = 'pending' OR review_note != '' OR sensitive_flags != '' ORDER BY created_at DESC LIMIT 30")
      .all() as SqlRow[];
    const comments = db
      .prepare("SELECT id, record_id, nickname, content, status, review_note, sensitive_flags, created_at FROM comments WHERE status = 'pending' OR review_note != '' OR sensitive_flags != '' ORDER BY created_at DESC LIMIT 30")
      .all() as SqlRow[];
    return { records, comments };
  });

  app.get('/api/admin/safety', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const words = db.prepare('SELECT * FROM sensitive_words ORDER BY enabled DESC, category ASC, word ASC').all() as SqlRow[];
    const flags = {
      records: db
          .prepare("SELECT id, nickname, activity_text, activity_tags, description, status, review_note, sensitive_flags, created_at FROM slacking_records WHERE status = 'pending' OR review_note != '' OR sensitive_flags != '' ORDER BY created_at DESC LIMIT 12")
        .all(),
      comments: db
        .prepare("SELECT id, record_id, nickname, content, status, review_note, sensitive_flags, created_at FROM comments WHERE status = 'pending' OR review_note != '' OR sensitive_flags != '' ORDER BY created_at DESC LIMIT 12")
        .all()
    };
    return {
      sensitiveWords: words.map((row) => ({
        id: Number(row.id),
        word: String(row.word),
        category: String(row.category),
        severity: String(row.severity),
        enabled: Boolean(row.enabled),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at)
      })),
      rules: settingsMap(),
      flags
    };
  });

  app.put('/api/admin/safety/sensitive-words', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const parsed = sensitiveWordsSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: '敏感词配置无效。' });
    const before = db.prepare('SELECT * FROM sensitive_words ORDER BY id ASC').all() as SqlRow[];
    const now = new Date().toISOString();
    db.exec('DELETE FROM sensitive_words');
    const insert = db.prepare('INSERT INTO sensitive_words (word, category, severity, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
    for (const word of parsed.data.words) {
      insert.run(word.word, word.category, word.severity, word.enabled ? 1 : 0, now, now);
    }
    const after = db.prepare('SELECT * FROM sensitive_words ORDER BY id ASC').all() as SqlRow[];
    writeAdminAuditLog(request, {
      adminUsername: session.username,
      action: 'sensitive_words_update',
      targetType: 'safety',
      targetId: 'sensitive_words',
      before,
      after
    });
    return { sensitiveWords: after };
  });

  app.put('/api/admin/safety/rules', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const parsed = settingsSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: '安全规则配置无效。' });
    const before = settingsMap();
    if (parsed.data.commentMaxLength !== undefined) saveSetting('comment_max_length', String(parsed.data.commentMaxLength));
    if (parsed.data.descriptionMaxLength !== undefined) saveSetting('description_max_length', String(parsed.data.descriptionMaxLength));
    if (parsed.data.defaultRecordStatus !== undefined) saveSetting('default_record_status', parsed.data.defaultRecordStatus);
    if (parsed.data.safetyNotice !== undefined) saveSetting('safety_notice', parsed.data.safetyNotice);
    const after = settingsMap();
    writeAdminAuditLog(request, {
      adminUsername: session.username,
      action: 'safety_rules_update',
      targetType: 'safety',
      targetId: 'rules',
      before,
      after
    });
    return { rules: after };
  });

  app.get('/api/admin/settings', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    return { settings: settingsMap() };
  });

  app.put('/api/admin/settings', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const parsed = settingsSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: '站点配置无效。' });
    const before = settingsMap();
    if (parsed.data.communityOpen !== undefined) saveSetting('community_open', String(parsed.data.communityOpen));
    if (parsed.data.commentsOpen !== undefined) saveSetting('comments_open', String(parsed.data.commentsOpen));
    if (parsed.data.groupCreationOpen !== undefined) saveSetting('group_creation_open', String(parsed.data.groupCreationOpen));
    if (parsed.data.legendNominationOpen !== undefined) saveSetting('legend_nomination_open', String(parsed.data.legendNominationOpen));
    if (parsed.data.commentMaxLength !== undefined) saveSetting('comment_max_length', String(parsed.data.commentMaxLength));
    if (parsed.data.descriptionMaxLength !== undefined) saveSetting('description_max_length', String(parsed.data.descriptionMaxLength));
    if (parsed.data.defaultRecordStatus !== undefined) saveSetting('default_record_status', parsed.data.defaultRecordStatus);
    if (parsed.data.safetyNotice !== undefined) saveSetting('safety_notice', parsed.data.safetyNotice);
    const after = settingsMap();
    writeAdminAuditLog(request, {
      adminUsername: session.username,
      action: 'settings_update',
      targetType: 'settings',
      targetId: 'site',
      before,
      after
    });
    return { settings: after };
  });

  app.get('/api/admin/audit-logs', async (request, reply) => {
    const session = requireAdminSession(request, reply);
    if (!session) return;
    const parsed = pageQuerySchema.extend({ action: z.string().trim().max(80).default('') }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: '日志筛选参数无效。' });
    const whereSql = parsed.data.action ? 'WHERE action LIKE ?' : '';
    const params = parsed.data.action ? [`%${parsed.data.action}%`] : [];
    const result = runPaged(`SELECT * FROM admin_audit_logs ${whereSql} ORDER BY created_at DESC`, `SELECT COUNT(*) AS count FROM admin_audit_logs ${whereSql}`, params, parsed.data.page, parsed.data.page_size);
    return { logs: result.rows.map(adminAudit), total: result.total, page: parsed.data.page, pageSize: parsed.data.page_size };
  });
};
