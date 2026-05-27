import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  LEGACY_SINGLE_RECORD_SCORE_NORMALIZATION_DIVISOR,
  SINGLE_RECORD_FISH_POWER_SCORE_MAX,
  SINGLE_RECORD_FISH_POWER_SCORE_MIN,
  clampSingleRecordFishPowerScore,
  type ScoreBreakdown
} from '../shared/scoring.js';
import {
  AI_JUDGE_PROMPT_KEY,
  AI_JUDGE_PROMPT_NAME,
  DEFAULT_AI_JUDGE_SYSTEM_PROMPT
} from '../shared/aiJudgePrompt.js';
import { findSlackingTypeOption } from '../shared/slackingTypes.js';
import { OFFICIAL_CIRCLES, OFFICIAL_GUILDS, getCircleSlugsForRecord } from '../shared/social.js';
import { createTopicSlug, type Topic } from '../shared/topics.js';
import { getTodayRange, getWeekRange, type PeriodRange } from './time.js';

export type StoredRecord = {
  id: number;
  user_id: number | null;
  nickname: string;
  slacking_type: string;
  slacking_type_id: string;
  slacking_type_group: string;
  activity_text: string;
  activity_tags: string;
  duration: string;
  risk: string;
  disguise: string;
  creativity: string;
  description: string;
  story_text: string;
  base_score: number;
  duration_score: number;
  duration_base_score: number;
  duration_multiplier: number;
  risk_multiplier: number;
  disguise_bonus: number;
  creativity_bonus: number;
  fish_power_score: number;
  score_version: string;
  score_breakdown: string;
  title: string;
  system_comment: string;
  status: 'approved' | 'published' | 'pending' | 'hidden' | 'rejected';
  review_note: string;
  visibility: 'public' | 'private';
  sensitive_flags: string;
  reviewed_by: string;
  reviewed_at: string;
  hidden_reason: string;
  like_count: number;
  favorite_count: number;
  vote_count: number;
  legend_nomination_count: number;
  report_count: number;
  comment_count: number;
  share_count: number;
  guild_id: number | null;
  guild_contribution: number;
  created_at: string;
  updated_at: string;
};

export type StoredTopic = Topic;

export type StoredAiPrompt = {
  id: number;
  key: string;
  name: string;
  content: string;
  description: string;
  version: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  updated_by: string;
  last_tested_at: string;
};

export type GuildEventType =
  | 'guild_created'
  | 'member_joined'
  | 'member_left'
  | 'member_removed'
  | 'announcement_created'
  | 'record_contributed';

export type GuildEvent = {
  id: number;
  guildId: number;
  actorUserId: number | null;
  eventType: GuildEventType;
  targetType: string;
  targetId: number | null;
  content: string;
  createdAt: string;
};

export type FishScaleTransactionType = 'earn_submission' | 'earn_interaction' | 'spend' | 'admin_adjustment';
export type FishScaleEarnCategory = 'submission' | 'interaction';

export type FishScaleWallet = {
  id: number;
  userId: number;
  fishScaleBalance: number;
  fishScaleTotalEarned: number;
  fishScaleTotalSpent: number;
  level: string;
  createdAt: string;
  updatedAt: string;
};

export type FishScaleTransaction = {
  id: number;
  userId: number;
  amount: number;
  type: FishScaleTransactionType;
  reason: string;
  relatedType: string;
  relatedId: number | null;
  balanceAfter: number;
  createdAt: string;
};

export type FishScaleChangeResult = {
  requestedAmount: number;
  amount: number;
  wallet: FishScaleWallet;
  transaction: FishScaleTransaction | null;
  capped: boolean;
  message: string;
};

export type RecordSubmissionFishScaleReward = {
  baseAmount: number;
  firstSubmissionBonus: number;
  awardedAmount: number;
  transactions: FishScaleTransaction[];
  wallet: FishScaleWallet;
  message: string;
};

export const FISH_SCALE_INSUFFICIENT_MESSAGE = '鱼鳞不足，今天再摸一会儿？';

export type NotificationType =
  | 'record_like'
  | 'record_comment'
  | 'record_legend'
  | 'wallet_reward'
  | 'record_review'
  | 'group_goal_completed';

export type CreateNotificationInput = {
  userId: number | null | undefined;
  type: NotificationType;
  title: string;
  body?: string;
  targetType?: string;
  targetId?: number | null;
  dedupeKey: string;
  actorUserId?: number | null;
};

export type CreateNotificationResult = {
  created: boolean;
  id: number | null;
  reason?: string;
};

export type GroupGoal = {
  id: number;
  group_id: number;
  goal_type: string;
  target_value: number;
  period_key: string;
  status: string;
  reward_title: string;
  created_at: string;
  completed_at: string;
};

export type GroupGoalProgress = {
  goal: GroupGoal;
  period: PeriodRange;
  currentValue: number;
  targetValue: number;
  percent: number;
  completed: boolean;
  contributions: {
    userId: number;
    username: string;
    displayName: string;
    recordCount: number;
    score: number;
  }[];
};

const FISH_SCALE_DAILY_CAPS = {
  submission: 50,
  interaction: 50,
  total: 120
} as const;

const FISH_SCALE_LEVELS = [
  { min: 1000, title: '深海鱼王' },
  { min: 500, title: '水域承包人' },
  { min: 200, title: '亮鳞老手' },
  { min: 50, title: '攒鳞新手' },
  { min: 0, title: '浅水鱼苗' }
] as const;

const dataDir = join(process.cwd(), 'data');
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(join(dataDir, 'gongwei-yuwang.sqlite'));

let transactionSequence = 0;

export const runInTransaction = <T>(fn: () => T): T => {
  transactionSequence += 1;
  const savepoint = `codex_tx_${transactionSequence}`;
  db.exec(`SAVEPOINT ${savepoint}`);
  try {
    const result = fn();
    db.exec(`RELEASE SAVEPOINT ${savepoint}`);
    return result;
  } catch (error) {
    try {
      db.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    } finally {
      db.exec(`RELEASE SAVEPOINT ${savepoint}`);
    }
    throw error;
  }
};

export const createNotificationIfNotExists = (input: CreateNotificationInput): CreateNotificationResult => {
  try {
    const userId = Number(input.userId ?? 0);
    if (!Number.isInteger(userId) || userId <= 0) {
      return { created: false, id: null, reason: 'invalid_user' };
    }
    if (input.actorUserId && Number(input.actorUserId) === userId) {
      return { created: false, id: null, reason: 'self_action' };
    }
    const dedupeKey = input.dedupeKey.trim();
    if (!dedupeKey) {
      console.warn(`[notifications] skipped ${input.type}: dedupeKey is required`);
      return { created: false, id: null, reason: 'missing_dedupe_key' };
    }
    const user = db.prepare('SELECT id FROM users WHERE id = ? LIMIT 1').get(userId);
    if (!user) {
      return { created: false, id: null, reason: 'unknown_user' };
    }

    const now = new Date().toISOString();
    const result = db
      .prepare(
        `
          INSERT OR IGNORE INTO notifications (
            user_id,
            type,
            title,
            body,
            target_type,
            target_id,
            dedupe_key,
            is_read,
            created_at,
            read_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, '')
        `
      )
      .run(
        userId,
        input.type,
        input.title.trim(),
        input.body?.trim() ?? '',
        input.targetType?.trim() ?? '',
        input.targetId ?? null,
        dedupeKey,
        now
      );

    return {
      created: Number(result.changes ?? 0) > 0,
      id: Number(result.changes ?? 0) > 0 ? Number(result.lastInsertRowid) : null,
      reason: Number(result.changes ?? 0) > 0 ? undefined : 'duplicate'
    };
  } catch (error) {
    console.warn(`[notifications] failed to create ${input.type}:`, error);
    return { created: false, id: null, reason: 'write_failed' };
  }
};

export const createNotification = createNotificationIfNotExists;

const getColumns = (table: string): Set<string> => {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return new Set(rows.map((row) => row.name));
};

const addColumnIfMissing = (table: string, column: string, definition: string): void => {
  if (!getColumns(table).has(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

const appendScoreMigrationMarkerSql = `
  CASE
    WHEN score_version LIKE '%single_record_10pt_v1%' THEN score_version
    ELSE COALESCE(NULLIF(score_version, ''), 'legacy_type_v1') || '+single_record_10pt_v1'
  END
`;

const normalizeStoredSingleRecordScores = (): void => {
  db.prepare(
    `
      UPDATE slacking_records
      SET fish_power_score = ?,
          score_version = ${appendScoreMigrationMarkerSql}
      WHERE fish_power_score < ?
         OR fish_power_score != fish_power_score
    `
  ).run(SINGLE_RECORD_FISH_POWER_SCORE_MIN, SINGLE_RECORD_FISH_POWER_SCORE_MIN);

  db.prepare(
    `
      UPDATE slacking_records
      SET fish_power_score = ROUND(MIN(?, MAX(?, fish_power_score / ?)), 1),
          score_version = ${appendScoreMigrationMarkerSql}
      WHERE fish_power_score > ?
    `
  ).run(
    SINGLE_RECORD_FISH_POWER_SCORE_MAX,
    SINGLE_RECORD_FISH_POWER_SCORE_MIN,
    LEGACY_SINGLE_RECORD_SCORE_NORMALIZATION_DIVISOR,
    SINGLE_RECORD_FISH_POWER_SCORE_MAX
  );
};

const finiteScoreNumber = (value: number | undefined, fallback = 0): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const normalizeScoreBreakdownForStorage = (score: ScoreBreakdown): ScoreBreakdown => {
  const fishPowerScore = clampSingleRecordFishPowerScore(score.fishPowerScore);
  return {
    ...score,
    baseScore: finiteScoreNumber(score.baseScore),
    durationScore: finiteScoreNumber(score.durationScore),
    durationBaseScore: finiteScoreNumber(score.durationBaseScore),
    durationMultiplier: finiteScoreNumber(score.durationMultiplier, 1),
    riskMultiplier: finiteScoreNumber(score.riskMultiplier, 1),
    disguiseBonus: finiteScoreNumber(score.disguiseBonus),
    creativityBonus: finiteScoreNumber(score.creativityBonus),
    rawScore: finiteScoreNumber(score.rawScore, fishPowerScore),
    displayScore: clampSingleRecordFishPowerScore(score.displayScore ?? fishPowerScore),
    fishPowerScore,
    singleRecordScoreMax: SINGLE_RECORD_FISH_POWER_SCORE_MAX
  };
};

export const initDatabase = (): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      locale TEXT NOT NULL DEFAULT 'zh-CN',
      is_admin INTEGER NOT NULL DEFAULT 0,
      avatar_seed TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      avatar_storage_key TEXT NOT NULL DEFAULT '',
      avatar_status TEXT NOT NULL DEFAULT 'active',
      avatar_updated_at TEXT NOT NULL DEFAULT '',
      guild_id INTEGER,
      total_score REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (guild_id) REFERENCES guilds(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      nonce TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS user_avatar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      old_avatar_storage_key TEXT NOT NULL DEFAULT '',
      new_avatar_storage_key TEXT NOT NULL DEFAULT '',
      reason TEXT NOT NULL DEFAULT '',
      actor_type TEXT NOT NULL DEFAULT 'user',
      actor_id INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (actor_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS avatar_upload_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS user_wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      fish_scale_balance INTEGER NOT NULL DEFAULT 0 CHECK(fish_scale_balance >= 0),
      fish_scale_total_earned INTEGER NOT NULL DEFAULT 0,
      fish_scale_total_spent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS fish_scale_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      reason TEXT NOT NULL,
      related_type TEXT NOT NULL DEFAULT '',
      related_id INTEGER,
      balance_after INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      target_type TEXT NOT NULL DEFAULT '',
      target_id INTEGER,
      dedupe_key TEXT NOT NULL DEFAULT '',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      read_at TEXT NOT NULL DEFAULT '',
      UNIQUE(user_id, dedupe_key),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS slacking_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      nickname TEXT NOT NULL,
      slacking_type TEXT NOT NULL,
      slacking_type_id TEXT NOT NULL DEFAULT '',
      slacking_type_group TEXT NOT NULL DEFAULT '',
      activity_text TEXT NOT NULL DEFAULT '',
      activity_tags TEXT NOT NULL DEFAULT '',
      duration TEXT NOT NULL,
      risk TEXT NOT NULL,
      disguise TEXT NOT NULL,
      creativity TEXT NOT NULL,
      description TEXT NOT NULL,
      story_text TEXT NOT NULL DEFAULT '',
      base_score REAL NOT NULL,
      duration_score REAL NOT NULL DEFAULT 0,
      duration_base_score REAL NOT NULL DEFAULT 0,
      duration_multiplier REAL NOT NULL,
      risk_multiplier REAL NOT NULL,
      disguise_bonus REAL NOT NULL,
      creativity_bonus REAL NOT NULL,
      fish_power_score REAL NOT NULL,
      score_version TEXT NOT NULL DEFAULT 'legacy_type_v1',
      title TEXT NOT NULL,
      system_comment TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      review_note TEXT NOT NULL DEFAULT '',
      visibility TEXT NOT NULL DEFAULT 'public',
      like_count INTEGER NOT NULL DEFAULT 0,
      favorite_count INTEGER NOT NULL DEFAULT 0,
      vote_count INTEGER NOT NULL DEFAULT 0,
      legend_nomination_count INTEGER NOT NULL DEFAULT 0,
      report_count INTEGER NOT NULL DEFAULT 0,
      comment_count INTEGER NOT NULL DEFAULT 0,
      share_count INTEGER NOT NULL DEFAULT 0,
      guild_id INTEGER,
      guild_contribution REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (guild_id) REFERENCES guilds(id)
    );

    CREATE TABLE IF NOT EXISTS record_interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(record_id, user_id, action),
      FOREIGN KEY (record_id) REFERENCES slacking_records(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      nickname TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      review_note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (record_id) REFERENCES slacking_records(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS guilds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      owner_user_id INTEGER,
      created_by_user_id INTEGER,
      source TEXT NOT NULL DEFAULT 'official',
      join_policy TEXT NOT NULL DEFAULT 'open',
      status TEXT NOT NULL DEFAULT 'active',
      total_contribution REAL NOT NULL DEFAULT 0,
      member_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (owner_user_id) REFERENCES users(id),
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS guild_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TEXT NOT NULL,
      FOREIGN KEY (guild_id) REFERENCES guilds(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS guild_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id INTEGER NOT NULL,
      actor_user_id INTEGER,
      event_type TEXT NOT NULL,
      target_type TEXT NOT NULL DEFAULT '',
      target_id INTEGER,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (guild_id) REFERENCES guilds(id),
      FOREIGN KEY (actor_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS circles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      member_count INTEGER NOT NULL DEFAULT 0,
      record_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS circle_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      circle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at TEXT NOT NULL,
      UNIQUE(circle_id, user_id),
      FOREIGN KEY (circle_id) REFERENCES circles(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS record_circles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL,
      circle_id INTEGER NOT NULL,
      UNIQUE(record_id, circle_id),
      FOREIGN KEY (record_id) REFERENCES slacking_records(id),
      FOREIGN KEY (circle_id) REFERENCES circles(id)
    );

    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      usage_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS record_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL,
      topic_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(record_id, topic_id),
      FOREIGN KEY (record_id) REFERENCES slacking_records(id),
      FOREIGN KEY (topic_id) REFERENCES topics(id)
    );

    CREATE TABLE IF NOT EXISTS "groups" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      visibility TEXT NOT NULL DEFAULT 'public',
      invite_code TEXT NOT NULL UNIQUE,
      owner_user_id INTEGER NOT NULL,
      member_count INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (owner_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      nickname_title TEXT NOT NULL DEFAULT '',
      joined_at TEXT NOT NULL,
      UNIQUE(group_id, user_id),
      FOREIGN KEY (group_id) REFERENCES "groups"(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS record_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      shared_at TEXT NOT NULL,
      UNIQUE(record_id, group_id),
      FOREIGN KEY (record_id) REFERENCES slacking_records(id),
      FOREIGN KEY (group_id) REFERENCES "groups"(id)
    );

    CREATE TABLE IF NOT EXISTS group_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      goal_type TEXT NOT NULL,
      target_value INTEGER NOT NULL,
      period_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      reward_title TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      completed_at TEXT NOT NULL DEFAULT '',
      UNIQUE(group_id, period_key, goal_type),
      FOREIGN KEY (group_id) REFERENCES "groups"(id)
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      reaction_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(target_type, target_id, user_id, reaction_type),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_note TEXT NOT NULL DEFAULT '',
      resolved_by TEXT NOT NULL DEFAULT '',
      resolved_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_username TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      before_json TEXT NOT NULL DEFAULT '',
      after_json TEXT NOT NULL DEFAULT '',
      ip TEXT NOT NULL DEFAULT '',
      user_agent TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      version INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT NOT NULL DEFAULT '',
      last_tested_at TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS sensitive_words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT '隐私身份',
      severity TEXT NOT NULL DEFAULT 'medium',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      nickname TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      contact TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      checkin_date TEXT NOT NULL,
      streak INTEGER NOT NULL DEFAULT 1,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      UNIQUE(user_id, checkin_date),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS moderation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      admin_user_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (admin_user_id) REFERENCES users(id)
    );
  `);

  addColumnIfMissing('users', 'avatar_seed', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('users', 'avatar_url', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('users', 'avatar_storage_key', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('users', 'avatar_status', "TEXT NOT NULL DEFAULT 'active'");
  addColumnIfMissing('users', 'avatar_updated_at', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('users', 'guild_id', 'INTEGER');
  addColumnIfMissing('users', 'total_score', 'REAL NOT NULL DEFAULT 0');
  addColumnIfMissing('users', 'status', "TEXT NOT NULL DEFAULT 'active'");
  addColumnIfMissing('users', 'mute_until', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('users', 'ban_reason', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('slacking_records', 'user_id', 'INTEGER');
  addColumnIfMissing('slacking_records', 'slacking_type_id', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('slacking_records', 'slacking_type_group', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('slacking_records', 'activity_text', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('slacking_records', 'activity_tags', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('slacking_records', 'story_text', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('slacking_records', 'duration_score', 'REAL NOT NULL DEFAULT 0');
  addColumnIfMissing('slacking_records', 'duration_base_score', 'REAL NOT NULL DEFAULT 0');
  addColumnIfMissing('slacking_records', 'score_version', "TEXT NOT NULL DEFAULT 'legacy_type_v1'");
  addColumnIfMissing('slacking_records', 'score_breakdown', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('slacking_records', 'status', "TEXT NOT NULL DEFAULT 'approved'");
  addColumnIfMissing('slacking_records', 'review_note', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('slacking_records', 'visibility', "TEXT NOT NULL DEFAULT 'public'");
  addColumnIfMissing('slacking_records', 'sensitive_flags', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('slacking_records', 'reviewed_by', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('slacking_records', 'reviewed_at', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('slacking_records', 'hidden_reason', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('slacking_records', 'like_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('slacking_records', 'favorite_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('slacking_records', 'vote_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('slacking_records', 'legend_nomination_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('slacking_records', 'legend_selected', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('slacking_records', 'report_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('slacking_records', 'comment_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('slacking_records', 'share_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('slacking_records', 'guild_id', 'INTEGER');
  addColumnIfMissing('slacking_records', 'guild_contribution', 'REAL NOT NULL DEFAULT 0');
  addColumnIfMissing('slacking_records', 'updated_at', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('comments', 'sensitive_flags', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('comments', 'review_note', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('comments', 'reviewed_by', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('comments', 'reviewed_at', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('comments', 'updated_at', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('reports', 'status', "TEXT NOT NULL DEFAULT 'pending'");
  addColumnIfMissing('reports', 'admin_note', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('reports', 'resolved_by', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('reports', 'resolved_at', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('guilds', 'owner_user_id', 'INTEGER');
  addColumnIfMissing('guilds', 'created_by_user_id', 'INTEGER');
  addColumnIfMissing('guilds', 'source', "TEXT NOT NULL DEFAULT 'official'");
  addColumnIfMissing('guilds', 'join_policy', "TEXT NOT NULL DEFAULT 'open'");
  addColumnIfMissing('guilds', 'status', "TEXT NOT NULL DEFAULT 'active'");
  addColumnIfMissing('guilds', 'updated_at', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('circles', 'status', "TEXT NOT NULL DEFAULT 'active'");
  addColumnIfMissing('circles', 'updated_at', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('topics', 'usage_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('topics', 'status', "TEXT NOT NULL DEFAULT 'active'");
  addColumnIfMissing('topics', 'updated_at', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('"groups"', 'status', "TEXT NOT NULL DEFAULT 'active'");
  addColumnIfMissing('"groups"', 'updated_at', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('ai_prompts', 'description', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('ai_prompts', 'version', 'INTEGER NOT NULL DEFAULT 1');
  addColumnIfMissing('ai_prompts', 'is_active', 'INTEGER NOT NULL DEFAULT 1');
  addColumnIfMissing('ai_prompts', 'updated_by', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('ai_prompts', 'last_tested_at', "TEXT NOT NULL DEFAULT ''");
  db.exec("UPDATE slacking_records SET slacking_type_id = slacking_type WHERE slacking_type_id = ''");
  db.exec("UPDATE slacking_records SET activity_text = slacking_type WHERE activity_text = ''");
  db.exec("UPDATE slacking_records SET story_text = description WHERE story_text = ''");
  db.exec("UPDATE slacking_records SET activity_tags = '[]' WHERE activity_tags = ''");
  db.exec("UPDATE slacking_records SET duration_base_score = base_score * duration_multiplier WHERE duration_base_score = 0 AND score_version != 'time_v2'");
  normalizeStoredSingleRecordScores();
  db.exec("UPDATE slacking_records SET updated_at = created_at WHERE updated_at = ''");
  db.exec("UPDATE comments SET updated_at = created_at WHERE updated_at = ''");
  db.exec("UPDATE guilds SET updated_at = created_at WHERE updated_at = ''");
  db.exec("UPDATE circles SET updated_at = created_at WHERE updated_at = ''");
  db.exec("UPDATE topics SET updated_at = created_at WHERE updated_at = ''");
  db.exec("UPDATE \"groups\" SET updated_at = created_at WHERE updated_at = ''");
  db.exec('DROP INDEX IF EXISTS idx_reports_unique_user_target');
  // Development-stage cleanup for the active-report unique index below:
  // keep the newest pending/reviewing report per user-target pair, leaving
  // resolved/rejected history unconstrained so users can report again later.
  db.exec(`
    DELETE FROM reports
    WHERE status IN ('pending', 'reviewing')
      AND id NOT IN (
        SELECT id
        FROM (
          SELECT MAX(id) AS id
          FROM reports
          WHERE status IN ('pending', 'reviewing')
          GROUP BY user_id, target_type, target_id
        )
      );
  `);
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString());
  db.prepare("DELETE FROM admin_sessions WHERE expires_at <= ? OR revoked_at != ''").run(new Date().toISOString());
  db.prepare(
    `
      INSERT OR IGNORE INTO ai_prompts (
        key,
        name,
        content,
        description,
        version,
        is_active,
        created_at,
        updated_at,
        updated_by,
        last_tested_at
      ) VALUES (?, ?, ?, ?, 1, 1, ?, ?, '', '')
    `
  ).run(
    AI_JUDGE_PROMPT_KEY,
    AI_JUDGE_PROMPT_NAME,
    DEFAULT_AI_JUDGE_SYSTEM_PROMPT,
    'DeepSeek AI 裁判结构化输出与毒舌评语系统提示词',
    new Date().toISOString(),
    new Date().toISOString()
  );
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_record_interactions_record ON record_interactions(record_id);
    CREATE INDEX IF NOT EXISTS idx_record_interactions_user ON record_interactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_record_interactions_action_created_at ON record_interactions(action, created_at);
    CREATE INDEX IF NOT EXISTS idx_user_avatar_events_user_created_at ON user_avatar_events(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_avatar_upload_attempts_user_created_at ON avatar_upload_attempts(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_user_wallets_user ON user_wallets(user_id);
    CREATE INDEX IF NOT EXISTS idx_fish_scale_transactions_user_created_at ON fish_scale_transactions(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_fish_scale_transactions_type_created_at ON fish_scale_transactions(type, created_at);
    CREATE INDEX IF NOT EXISTS idx_fish_scale_transactions_related ON fish_scale_transactions(related_type, related_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at ON notifications(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_comments_record ON comments(record_id);
    CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
    CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members(guild_id);
    CREATE INDEX IF NOT EXISTS idx_guilds_owner_user_id ON guilds(owner_user_id);
    CREATE INDEX IF NOT EXISTS idx_guilds_source ON guilds(source);
    CREATE INDEX IF NOT EXISTS idx_guilds_status ON guilds(status);
    CREATE INDEX IF NOT EXISTS idx_guild_events_guild_created_at ON guild_events(guild_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_guild_events_type ON guild_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_circle_members_user ON circle_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_record_circles_record ON record_circles(record_id);
    CREATE INDEX IF NOT EXISTS idx_record_circles_circle ON record_circles(circle_id);
    CREATE INDEX IF NOT EXISTS idx_topics_usage ON topics(usage_count);
    CREATE INDEX IF NOT EXISTS idx_topics_status ON topics(status);
    CREATE INDEX IF NOT EXISTS idx_record_topics_record ON record_topics(record_id);
    CREATE INDEX IF NOT EXISTS idx_record_topics_topic ON record_topics(topic_id);
    CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_record_groups_record ON record_groups(record_id);
    CREATE INDEX IF NOT EXISTS idx_record_groups_group ON record_groups(group_id);
    CREATE INDEX IF NOT EXISTS idx_group_goals_group_period ON group_goals(group_id, period_key);
    CREATE INDEX IF NOT EXISTS idx_group_goals_status ON group_goals(status);
    CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique_active_user_target
      ON reports(user_id, target_type, target_id)
      WHERE status IN ('pending', 'reviewing');
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_username ON admin_sessions(username);
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_ai_prompts_key_active ON ai_prompts(key, is_active);
    CREATE INDEX IF NOT EXISTS idx_sensitive_words_enabled ON sensitive_words(enabled);
    CREATE INDEX IF NOT EXISTS idx_suggestions_user ON suggestions(user_id);
    CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON checkins(user_id, checkin_date);
    CREATE INDEX IF NOT EXISTS idx_slacking_records_created_at ON slacking_records(created_at);
    CREATE INDEX IF NOT EXISTS idx_slacking_records_nickname ON slacking_records(nickname);
    CREATE INDEX IF NOT EXISTS idx_slacking_records_score ON slacking_records(fish_power_score);
    CREATE INDEX IF NOT EXISTS idx_slacking_records_disguise_bonus ON slacking_records(disguise_bonus);
    CREATE INDEX IF NOT EXISTS idx_slacking_records_type_id ON slacking_records(slacking_type_id);
    CREATE INDEX IF NOT EXISTS idx_slacking_records_type_group ON slacking_records(slacking_type_group);
    CREATE INDEX IF NOT EXISTS idx_slacking_records_activity_text ON slacking_records(activity_text);
    CREATE INDEX IF NOT EXISTS idx_slacking_records_score_version ON slacking_records(score_version);
    CREATE INDEX IF NOT EXISTS idx_slacking_records_user_id ON slacking_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_slacking_records_status ON slacking_records(status);
    CREATE INDEX IF NOT EXISTS idx_slacking_records_visibility ON slacking_records(visibility);
    CREATE INDEX IF NOT EXISTS idx_slacking_records_guild_id ON slacking_records(guild_id);
  `);
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_slacking_records_fish_score_insert_check
    BEFORE INSERT ON slacking_records
    WHEN NEW.fish_power_score < ${SINGLE_RECORD_FISH_POWER_SCORE_MIN}
      OR NEW.fish_power_score > ${SINGLE_RECORD_FISH_POWER_SCORE_MAX}
      OR NEW.fish_power_score != NEW.fish_power_score
    BEGIN
      SELECT RAISE(ABORT, 'fish_power_score must be between 0 and 10');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_slacking_records_fish_score_update_check
    BEFORE UPDATE OF fish_power_score ON slacking_records
    WHEN NEW.fish_power_score < ${SINGLE_RECORD_FISH_POWER_SCORE_MIN}
      OR NEW.fish_power_score > ${SINGLE_RECORD_FISH_POWER_SCORE_MAX}
      OR NEW.fish_power_score != NEW.fish_power_score
    BEGIN
      SELECT RAISE(ABORT, 'fish_power_score must be between 0 and 10');
    END;
  `);
  seedAdminDefaults();
  seedSocialDefaults();
  refreshAllSocialAggregates();
};

const seedAdminDefaults = (): void => {
  const now = new Date().toISOString();
  const settings = [
    ['community_open', 'true'],
    ['comments_open', 'true'],
    ['group_creation_open', 'true'],
    ['legend_nomination_open', 'true'],
    ['comment_max_length', '120'],
    ['description_max_length', '180'],
    ['default_record_status', 'published'],
    [
      'safety_notice',
      '请不要提交公司机密、个人隐私、员工证件、聊天记录、客户资料或未匿名化截图。\n本平台仅供娱乐，不支持真实违反职场规则的行为。'
    ]
  ] as const;
  const settingInsert = db.prepare('INSERT OR IGNORE INTO site_settings (key, value, updated_at) VALUES (?, ?, ?)');
  for (const [key, value] of settings) {
    settingInsert.run(key, value, now);
  }

  const words = [
    ['公司机密', '公司客户', 'high'],
    ['客户名单', '公司客户', 'high'],
    ['身份证', '证件号码', 'high'],
    ['工号', '隐私身份', 'medium'],
    ['电话', '联系方式', 'medium'],
    ['手机号', '联系方式', 'high'],
    ['微信号', '联系方式', 'medium'],
    ['截图', '聊天截图', 'high'],
    ['聊天记录', '聊天截图', 'high'],
    ['合同', '合同报价', 'high'],
    ['报价', '合同报价', 'high'],
    ['地址', '地理位置', 'medium'],
    ['部门', '公司客户', 'medium'],
    ['公司名', '公司客户', 'medium']
  ] as const;
  const wordInsert = db.prepare(
    'INSERT OR IGNORE INTO sensitive_words (word, category, severity, enabled, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)'
  );
  for (const [word, category, severity] of words) {
    wordInsert.run(word, category, severity, now, now);
  }
};

const seedSocialDefaults = (): void => {
  const now = new Date().toISOString();
  const guildInsert = db.prepare(
    'INSERT OR IGNORE INTO guilds (name, slug, description, icon, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  for (const guild of OFFICIAL_GUILDS) {
    guildInsert.run(guild.name, guild.slug, guild.description, guild.icon, now);
  }

  const circleInsert = db.prepare(
    'INSERT OR IGNORE INTO circles (name, slug, description, icon, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  for (const circle of OFFICIAL_CIRCLES) {
    circleInsert.run(circle.name, circle.slug, circle.description, circle.icon, now);
  }
};

const publicEventName = (name?: string | null): string => {
  const clean = String(name ?? '').trim().replace(/\s+/g, ' ');
  return clean || '某位成员';
};

const guildEventContent = (input: {
  eventType: GuildEventType;
  actorDisplayName?: string | null;
  targetDisplayName?: string | null;
  contribution?: number | null;
}): string => {
  const actorName = publicEventName(input.actorDisplayName);
  const targetName = publicEventName(input.targetDisplayName);
  if (input.eventType === 'guild_created') return `${actorName}创建了工会。`;
  if (input.eventType === 'member_joined') return `${actorName}加入了工会。`;
  if (input.eventType === 'member_left') return `${actorName}退出了工会。`;
  if (input.eventType === 'member_removed') return `${targetName}被移出了工会。`;
  if (input.eventType === 'record_contributed') {
    const contribution = Number(input.contribution ?? 0).toFixed(1);
    return `${actorName}为工会贡献了 ${contribution} 点摸鱼能量。`;
  }
  return '工会发布了一条公告。';
};

const mapGuildEvent = (row: Record<string, unknown>): GuildEvent => ({
  id: Number(row.id),
  guildId: Number(row.guild_id),
  actorUserId: row.actor_user_id === null || row.actor_user_id === undefined ? null : Number(row.actor_user_id),
  eventType: String(row.event_type) as GuildEventType,
  targetType: String(row.target_type ?? ''),
  targetId: row.target_id === null || row.target_id === undefined ? null : Number(row.target_id),
  content: String(row.content ?? ''),
  createdAt: String(row.created_at ?? '')
});

export const createGuildEvent = (input: {
  guildId: number;
  actorUserId?: number | null;
  eventType: GuildEventType;
  targetType?: string;
  targetId?: number | null;
  actorDisplayName?: string | null;
  targetDisplayName?: string | null;
  contribution?: number | null;
  createdAt?: string;
}): GuildEvent | null => {
  const guildId = Number(input.guildId);
  if (!Number.isInteger(guildId) || guildId <= 0) return null;
  const guild = db.prepare('SELECT id FROM guilds WHERE id = ? LIMIT 1').get(guildId);
  if (!guild) return null;
  const createdAt = input.createdAt ?? new Date().toISOString();
  const content = guildEventContent(input);
  const result = db
    .prepare(
      `
        INSERT INTO guild_events (
          guild_id,
          actor_user_id,
          event_type,
          target_type,
          target_id,
          content,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      guildId,
      input.actorUserId ?? null,
      input.eventType,
      input.targetType ?? '',
      input.targetId ?? null,
      content,
      createdAt
    );
  return mapGuildEvent(db.prepare('SELECT * FROM guild_events WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>);
};

export const listGuildEvents = (guildId: number, limit = 50): GuildEvent[] => {
  const requestedLimit = Number.isFinite(limit) ? Math.floor(limit) : 50;
  const safeLimit = Math.min(50, Math.max(1, requestedLimit));
  const rows = db
    .prepare(
      `
        SELECT *
        FROM guild_events
        WHERE guild_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ?
      `
    )
    .all(guildId, safeLimit) as Record<string, unknown>[];
  return rows.map(mapGuildEvent);
};

const mapFishScaleWallet = (row: Record<string, unknown>): FishScaleWallet => {
  const totalEarned = Number(row.fish_scale_total_earned ?? 0);
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    fishScaleBalance: Number(row.fish_scale_balance ?? 0),
    fishScaleTotalEarned: totalEarned,
    fishScaleTotalSpent: Number(row.fish_scale_total_spent ?? 0),
    level: getFishScaleLevel(totalEarned),
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? '')
  };
};

const mapFishScaleTransaction = (row: Record<string, unknown>): FishScaleTransaction => ({
  id: Number(row.id),
  userId: Number(row.user_id),
  amount: Number(row.amount ?? 0),
  type: String(row.type) as FishScaleTransactionType,
  reason: String(row.reason ?? ''),
  relatedType: String(row.related_type ?? ''),
  relatedId: row.related_id === null || row.related_id === undefined ? null : Number(row.related_id),
  balanceAfter: Number(row.balance_after ?? 0),
  createdAt: String(row.created_at ?? '')
});

export const getFishScaleLevel = (totalEarned: number): string =>
  FISH_SCALE_LEVELS.find((level) => totalEarned >= level.min)?.title ?? FISH_SCALE_LEVELS[FISH_SCALE_LEVELS.length - 1].title;

export const ensureUserWallet = (userId: number): FishScaleWallet => {
  const existing = db.prepare('SELECT * FROM user_wallets WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;
  if (existing) return mapFishScaleWallet(existing);

  const now = new Date().toISOString();
  db.prepare(
    `
      INSERT INTO user_wallets (
        user_id,
        fish_scale_balance,
        fish_scale_total_earned,
        fish_scale_total_spent,
        created_at,
        updated_at
      ) VALUES (?, 0, 0, 0, ?, ?)
    `
  ).run(userId, now, now);

  return mapFishScaleWallet(db.prepare('SELECT * FROM user_wallets WHERE user_id = ?').get(userId) as Record<string, unknown>);
};

export const getFishScaleWallet = (userId: number): FishScaleWallet => ensureUserWallet(userId);

const getDailyEarnedAmount = (userId: number, category?: FishScaleEarnCategory): number => {
  const today = getTodayRange();
  const typeWhere =
    category === 'submission'
      ? "AND type = 'earn_submission'"
      : category === 'interaction'
        ? "AND type = 'earn_interaction'"
        : "AND type IN ('earn_submission', 'earn_interaction')";
  const row = db
    .prepare(
      `
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM fish_scale_transactions
        WHERE user_id = ?
          AND amount > 0
          ${typeWhere}
          AND created_at >= ?
          AND created_at < ?
      `
    )
    .get(userId, today.start, today.end) as { total: number };
  return Number(row.total ?? 0);
};

const createFishScaleTransaction = (input: {
  userId: number;
  amount: number;
  type: FishScaleTransactionType;
  reason: string;
  relatedType?: string;
  relatedId?: number | null;
  balanceAfter: number;
  createdAt: string;
}): FishScaleTransaction => {
  const result = db
    .prepare(
      `
        INSERT INTO fish_scale_transactions (
          user_id,
          amount,
          type,
          reason,
          related_type,
          related_id,
          balance_after,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      input.userId,
      input.amount,
      input.type,
      input.reason,
      input.relatedType ?? '',
      input.relatedId ?? null,
      input.balanceAfter,
      input.createdAt
    );
  return mapFishScaleTransaction(db.prepare('SELECT * FROM fish_scale_transactions WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>);
};

export const hasFishScaleTransaction = (input: {
  userId: number;
  type?: FishScaleTransactionType;
  reason: string;
  relatedType: string;
  relatedId: number | null;
}): boolean => {
  const row = db
    .prepare(
      `
        SELECT id
        FROM fish_scale_transactions
        WHERE user_id = ?
          AND (? = '' OR type = ?)
          AND reason = ?
          AND related_type = ?
          AND COALESCE(related_id, -1) = COALESCE(?, -1)
        LIMIT 1
      `
    )
    .get(input.userId, input.type ?? '', input.type ?? '', input.reason, input.relatedType, input.relatedId) as { id: number } | undefined;
  return Boolean(row);
};

export const creditFishScale = (input: {
  userId: number;
  amount: number;
  type: 'earn_submission' | 'earn_interaction' | 'admin_adjustment';
  reason: string;
  relatedType?: string;
  relatedId?: number | null;
  category?: FishScaleEarnCategory;
}): FishScaleChangeResult => {
  const requestedAmount = Math.max(0, Math.floor(input.amount));
  let wallet = ensureUserWallet(input.userId);
  if (requestedAmount <= 0) {
    return {
      requestedAmount,
      amount: 0,
      wallet,
      transaction: null,
      capped: false,
      message: '没有鱼鳞变动。'
    };
  }

  let amount = requestedAmount;
  let capped = false;
  if (input.category) {
    const categoryAvailable = Math.max(0, FISH_SCALE_DAILY_CAPS[input.category] - getDailyEarnedAmount(input.userId, input.category));
    const totalAvailable = Math.max(0, FISH_SCALE_DAILY_CAPS.total - getDailyEarnedAmount(input.userId));
    amount = Math.min(requestedAmount, categoryAvailable, totalAvailable);
    capped = amount < requestedAmount;
  }

  if (amount <= 0) {
    return {
      requestedAmount,
      amount: 0,
      wallet,
      transaction: null,
      capped: true,
      message: '今日鱼鳞获取已经到达上限。'
    };
  }

  const now = new Date().toISOString();
  const balanceAfter = wallet.fishScaleBalance + amount;
  db.prepare(
    `
      UPDATE user_wallets
      SET fish_scale_balance = ?,
          fish_scale_total_earned = fish_scale_total_earned + ?,
          updated_at = ?
      WHERE user_id = ?
    `
  ).run(balanceAfter, amount, now, input.userId);

  const transaction = createFishScaleTransaction({
    userId: input.userId,
    amount,
    type: input.type,
    reason: input.reason,
    relatedType: input.relatedType,
    relatedId: input.relatedId,
    balanceAfter,
    createdAt: now
  });
  createNotificationIfNotExists({
    userId: input.userId,
    type: 'wallet_reward',
    title: '鱼鳞到账',
    body: `本次获得 +${amount} 鱼鳞，余额 ${balanceAfter}。`,
    targetType: 'wallet_transaction',
    targetId: transaction.id,
    dedupeKey: `wallet_reward:${transaction.id}`
  });
  wallet = ensureUserWallet(input.userId);

  return {
    requestedAmount,
    amount,
    wallet,
    transaction,
    capped,
    message: amount > 0 ? `鱼鳞到账，工位水域扩大了。` : '没有鱼鳞变动。'
  };
};

export const spendFishScale = (input: {
  userId: number;
  amount: number;
  reason: string;
  relatedType?: string;
  relatedId?: number | null;
}): FishScaleChangeResult => {
  const amount = Math.max(0, Math.floor(input.amount));
  const wallet = ensureUserWallet(input.userId);
  if (amount <= 0) {
    return {
      requestedAmount: amount,
      amount: 0,
      wallet,
      transaction: null,
      capped: false,
      message: '没有鱼鳞变动。'
    };
  }
  if (wallet.fishScaleBalance < amount) {
    throw new Error(FISH_SCALE_INSUFFICIENT_MESSAGE);
  }

  const now = new Date().toISOString();
  const balanceAfter = wallet.fishScaleBalance - amount;
  db.prepare(
    `
      UPDATE user_wallets
      SET fish_scale_balance = ?,
          fish_scale_total_spent = fish_scale_total_spent + ?,
          updated_at = ?
      WHERE user_id = ?
    `
  ).run(balanceAfter, amount, now, input.userId);

  const transaction = createFishScaleTransaction({
    userId: input.userId,
    amount: -amount,
    type: 'spend',
    reason: input.reason,
    relatedType: input.relatedType,
    relatedId: input.relatedId,
    balanceAfter,
    createdAt: now
  });

  return {
    requestedAmount: amount,
    amount: -amount,
    wallet: ensureUserWallet(input.userId),
    transaction,
    capped: false,
    message: '鱼鳞已扣除。'
  };
};

export const adjustFishScale = (input: {
  userId: number;
  amount: number;
  reason: string;
  relatedType?: string;
  relatedId?: number | null;
}): FishScaleChangeResult => {
  const amount = Math.trunc(input.amount);
  if (amount === 0) {
    return {
      requestedAmount: 0,
      amount: 0,
      wallet: ensureUserWallet(input.userId),
      transaction: null,
      capped: false,
      message: '没有鱼鳞变动。'
    };
  }

  const wallet = ensureUserWallet(input.userId);
  if (wallet.fishScaleBalance + amount < 0) {
    throw new Error(FISH_SCALE_INSUFFICIENT_MESSAGE);
  }

  const now = new Date().toISOString();
  const balanceAfter = wallet.fishScaleBalance + amount;
  db.prepare(
    `
      UPDATE user_wallets
      SET fish_scale_balance = ?,
          fish_scale_total_earned = fish_scale_total_earned + ?,
          fish_scale_total_spent = fish_scale_total_spent + ?,
          updated_at = ?
      WHERE user_id = ?
    `
  ).run(balanceAfter, amount > 0 ? amount : 0, amount < 0 ? Math.abs(amount) : 0, now, input.userId);

  const transaction = createFishScaleTransaction({
    userId: input.userId,
    amount,
    type: 'admin_adjustment',
    reason: input.reason,
    relatedType: input.relatedType,
    relatedId: input.relatedId,
    balanceAfter,
    createdAt: now
  });

  return {
    requestedAmount: amount,
    amount,
    wallet: ensureUserWallet(input.userId),
    transaction,
    capped: false,
    message: amount > 0 ? '管理员已补发鱼鳞。' : '管理员已扣除鱼鳞。'
  };
};

export const calculateRecordSubmissionFishScale = (fishPowerScore: number): number =>
  Math.min(20, Math.floor(clampSingleRecordFishPowerScore(fishPowerScore) * 2));

export const grantRecordSubmissionFishScale = (input: {
  userId: number;
  recordId: number;
  fishPowerScore: number;
}): RecordSubmissionFishScaleReward => {
  const baseAmount = calculateRecordSubmissionFishScale(input.fishPowerScore);
  const today = getTodayRange();
  const submissionCount = Number(
    (
      db
        .prepare('SELECT COUNT(*) AS count FROM slacking_records WHERE user_id = ? AND created_at >= ? AND created_at < ?')
        .get(input.userId, today.start, today.end) as { count: number }
    ).count ?? 0
  );
  const firstSubmissionBonus = submissionCount <= 1 ? 10 : 0;
  const transactions: FishScaleTransaction[] = [];

  const base = creditFishScale({
    userId: input.userId,
    amount: baseAmount,
    type: 'earn_submission',
    reason: 'record_submission',
    relatedType: 'record',
    relatedId: input.recordId,
    category: 'submission'
  });
  if (base.transaction) transactions.push(base.transaction);

  const first = creditFishScale({
    userId: input.userId,
    amount: firstSubmissionBonus,
    type: 'earn_submission',
    reason: 'daily_first_submission',
    relatedType: 'record',
    relatedId: input.recordId,
    category: 'submission'
  });
  if (first.transaction) transactions.push(first.transaction);

  const awardedAmount = transactions.reduce((total, transaction) => total + Math.max(0, transaction.amount), 0);
  return {
    baseAmount,
    firstSubmissionBonus,
    awardedAmount,
    transactions,
    wallet: ensureUserWallet(input.userId),
    message: awardedAmount > 0 ? `本次摸鱼获得 +${awardedAmount} 鱼鳞。` : '今日提交鱼鳞已经到达上限。'
  };
};

export const grantInteractionFishScale = (input: {
  userId: number | null | undefined;
  amount: number;
  reason: string;
  relatedType: string;
  relatedId: number;
}): FishScaleChangeResult | null => {
  if (!input.userId) return null;
  if (
    hasFishScaleTransaction({
      userId: input.userId,
      type: 'earn_interaction',
      reason: input.reason,
      relatedType: input.relatedType,
      relatedId: input.relatedId
    })
  ) {
    return {
      requestedAmount: input.amount,
      amount: 0,
      wallet: ensureUserWallet(input.userId),
      transaction: null,
      capped: false,
      message: '这笔互动鱼鳞已经发放过。'
    };
  }

  return creditFishScale({
    userId: input.userId,
    amount: input.amount,
    type: 'earn_interaction',
    reason: input.reason,
    relatedType: input.relatedType,
    relatedId: input.relatedId,
    category: 'interaction'
  });
};

export const grantHotRecordFishScale = (recordId: number): FishScaleChangeResult | null => {
  const record = db.prepare('SELECT user_id, created_at FROM slacking_records WHERE id = ?').get(recordId) as
    | { user_id: number | null; created_at: string }
    | undefined;
  if (!record?.user_id) return null;
  const today = getTodayRange();
  if (record.created_at < today.start || record.created_at >= today.end) return null;
  return grantInteractionFishScale({
    userId: Number(record.user_id),
    amount: 20,
    reason: 'record_hot_today',
    relatedType: 'record',
    relatedId: recordId
  });
};

export const grantLegendSelectedFishScale = (recordId: number): FishScaleChangeResult | null => {
  const record = db.prepare('SELECT user_id FROM slacking_records WHERE id = ?').get(recordId) as { user_id: number | null } | undefined;
  if (!record?.user_id) return null;
  return grantInteractionFishScale({
    userId: Number(record.user_id),
    amount: 100,
    reason: 'legend_record_selected',
    relatedType: 'record',
    relatedId: recordId
  });
};

export const listFishScaleTransactions = (input: {
  userId?: number;
  page?: number;
  pageSize?: number;
  keyword?: string;
  type?: string;
}): { transactions: FishScaleTransaction[]; total: number; page: number; pageSize: number } => {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 30));
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (input.userId) {
    where.push('fish_scale_transactions.user_id = ?');
    params.push(input.userId);
  }
  if (input.type) {
    where.push('fish_scale_transactions.type = ?');
    params.push(input.type);
  }
  if (input.keyword?.trim()) {
    where.push('(users.username LIKE ? OR users.display_name LIKE ? OR fish_scale_transactions.reason LIKE ? OR fish_scale_transactions.related_type LIKE ?)');
    const keyword = `%${input.keyword.trim()}%`;
    params.push(keyword, keyword, keyword, keyword);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = Number(
    (
      db
        .prepare(
          `
            SELECT COUNT(*) AS count
            FROM fish_scale_transactions
            LEFT JOIN users ON users.id = fish_scale_transactions.user_id
            ${whereSql}
          `
        )
        .get(...params) as { count: number }
    ).count ?? 0
  );
  const rows = db
    .prepare(
      `
        SELECT fish_scale_transactions.*
        FROM fish_scale_transactions
        LEFT JOIN users ON users.id = fish_scale_transactions.user_id
        ${whereSql}
        ORDER BY fish_scale_transactions.created_at DESC, fish_scale_transactions.id DESC
        LIMIT ? OFFSET ?
      `
    )
    .all(...params, pageSize, (page - 1) * pageSize) as Record<string, unknown>[];

  return {
    transactions: rows.map(mapFishScaleTransaction),
    total,
    page,
    pageSize
  };
};

export const refreshAllSocialAggregates = (): void => {
  db.exec(`
    UPDATE users
    SET total_score = (
      SELECT COALESCE(SUM(fish_power_score), 0)
      FROM slacking_records
      WHERE slacking_records.user_id = users.id
        AND slacking_records.status != 'rejected'
    );

    UPDATE guilds
    SET member_count = (
      SELECT COUNT(*)
      FROM guild_members
      WHERE guild_members.guild_id = guilds.id
    ),
    total_contribution = (
      SELECT COALESCE(SUM(guild_contribution), 0)
      FROM slacking_records
      WHERE slacking_records.guild_id = guilds.id
        AND slacking_records.status = 'approved'
    );

    UPDATE circles
    SET member_count = (
      SELECT COUNT(*)
      FROM circle_members
      WHERE circle_members.circle_id = circles.id
    ),
    record_count = (
      SELECT COUNT(*)
      FROM record_circles
      JOIN slacking_records ON slacking_records.id = record_circles.record_id
      WHERE record_circles.circle_id = circles.id
        AND slacking_records.status = 'approved'
        AND slacking_records.visibility = 'public'
    );

    UPDATE "groups"
    SET member_count = (
      SELECT COUNT(*)
      FROM group_members
      WHERE group_members.group_id = "groups".id
    );
  `);
};

export const getGroupGoalPeriodKey = (range = getWeekRange()): string => `${range.start.slice(0, 10)}_${range.end.slice(0, 10)}`;

const mapGroupGoal = (row: Record<string, unknown>): GroupGoal => ({
  id: Number(row.id),
  group_id: Number(row.group_id),
  goal_type: String(row.goal_type ?? 'weekly_score'),
  target_value: Number(row.target_value ?? 0),
  period_key: String(row.period_key ?? ''),
  status: String(row.status ?? 'active'),
  reward_title: String(row.reward_title ?? ''),
  created_at: String(row.created_at ?? ''),
  completed_at: String(row.completed_at ?? '')
});

export const ensureCurrentGroupGoal = (groupId: number, now = new Date()): GroupGoal => {
  const range = getWeekRange(now);
  const periodKey = getGroupGoalPeriodKey(range);
  const existing = db
    .prepare('SELECT * FROM group_goals WHERE group_id = ? AND period_key = ? ORDER BY id ASC LIMIT 1')
    .get(groupId, periodKey) as Record<string, unknown> | undefined;
  if (existing) return mapGroupGoal(existing);

  const createdAt = new Date().toISOString();
  db.prepare(
    `
      INSERT OR IGNORE INTO group_goals (
        group_id,
        goal_type,
        target_value,
        period_key,
        status,
        reward_title,
        created_at,
        completed_at
      ) VALUES (?, 'weekly_score', 300, ?, 'active', '本周摸鱼协作完成', ?, '')
    `
  ).run(groupId, periodKey, createdAt);
  return mapGroupGoal(
    db.prepare('SELECT * FROM group_goals WHERE group_id = ? AND period_key = ? ORDER BY id ASC LIMIT 1').get(groupId, periodKey) as Record<string, unknown>
  );
};

export const getGroupGoalProgress = (groupId: number, goal = ensureCurrentGroupGoal(groupId), period = getWeekRange()): GroupGoalProgress => {
  const aggregate = db
    .prepare(
      `
        SELECT
          COALESCE(SUM(slacking_records.fish_power_score), 0) AS score,
          COUNT(slacking_records.id) AS records
        FROM record_groups
        JOIN slacking_records ON slacking_records.id = record_groups.record_id
        WHERE record_groups.group_id = ?
          AND slacking_records.status = 'approved'
          AND slacking_records.created_at >= ?
          AND slacking_records.created_at < ?
      `
    )
    .get(groupId, period.start, period.end) as { score: number; records: number };
  const currentValue = goal.goal_type === 'weekly_records' ? Number(aggregate.records ?? 0) : Number(Number(aggregate.score ?? 0).toFixed(1));
  const targetValue = Number(goal.target_value ?? 0);
  const contributions = db
    .prepare(
      `
        SELECT
          users.id AS user_id,
          users.username,
          users.display_name,
          COUNT(slacking_records.id) AS record_count,
          COALESCE(SUM(slacking_records.fish_power_score), 0) AS score
        FROM group_members
        JOIN users ON users.id = group_members.user_id
        LEFT JOIN record_groups ON record_groups.group_id = group_members.group_id
        LEFT JOIN slacking_records ON slacking_records.id = record_groups.record_id
          AND slacking_records.user_id = users.id
          AND slacking_records.status = 'approved'
          AND slacking_records.created_at >= ?
          AND slacking_records.created_at < ?
        WHERE group_members.group_id = ?
        GROUP BY users.id
        ORDER BY score DESC, record_count DESC, users.display_name ASC
        LIMIT 10
      `
    )
    .all(period.start, period.end, groupId) as Record<string, unknown>[];

  return {
    goal,
    period,
    currentValue,
    targetValue,
    percent: targetValue > 0 ? Math.min(100, Math.round((currentValue / targetValue) * 100)) : 0,
    completed: goal.status === 'completed' || (targetValue > 0 && currentValue >= targetValue),
    contributions: contributions.map((row) => ({
      userId: Number(row.user_id),
      username: String(row.username),
      displayName: String(row.display_name),
      recordCount: Number(row.record_count ?? 0),
      score: Number(Number(row.score ?? 0).toFixed(1))
    }))
  };
};

export const getCurrentGroupGoalProgress = (groupId: number, now = new Date()): GroupGoalProgress => {
  const range = getWeekRange(now);
  return getGroupGoalProgress(groupId, ensureCurrentGroupGoal(groupId, now), range);
};

export const checkAndCompleteGroupGoalsForRecord = (recordId: number, groupIds: number[]): GroupGoalProgress[] => {
  const uniqueGroupIds = [...new Set(groupIds.filter((id) => Number.isInteger(id) && id > 0))];
  if (!uniqueGroupIds.length) return [];
  const record = db
    .prepare("SELECT id, status, created_at FROM slacking_records WHERE id = ? AND status = 'approved'")
    .get(recordId) as { id: number; status: string; created_at: string } | undefined;
  if (!record) return [];
  const range = getWeekRange(new Date(record.created_at));
  const currentRange = getWeekRange();
  if (range.start !== currentRange.start || range.end !== currentRange.end) return [];

  const completed: GroupGoalProgress[] = [];
  for (const groupId of uniqueGroupIds) {
    const goal = ensureCurrentGroupGoal(groupId);
    if (goal.status === 'completed') continue;
    const progress = getGroupGoalProgress(groupId, goal, currentRange);
    if (!progress.completed) continue;
    const now = new Date().toISOString();
    const result = db
      .prepare("UPDATE group_goals SET status = 'completed', completed_at = ? WHERE id = ? AND status != 'completed'")
      .run(now, goal.id);
    if (Number(result.changes ?? 0) <= 0) continue;
    const updatedGoal = mapGroupGoal(db.prepare('SELECT * FROM group_goals WHERE id = ?').get(goal.id) as Record<string, unknown>);
    const updatedProgress = getGroupGoalProgress(groupId, updatedGoal, currentRange);
    const members = db.prepare('SELECT user_id FROM group_members WHERE group_id = ?').all(groupId) as { user_id: number }[];
    for (const member of members) {
      createNotificationIfNotExists({
        userId: Number(member.user_id),
        type: 'group_goal_completed',
        title: '小组周目标完成',
        body: `${updatedGoal.reward_title || '本周摸鱼协作完成'}：${updatedProgress.currentValue.toFixed(1)} / ${updatedProgress.targetValue}。`,
        targetType: 'group',
        targetId: groupId,
        dedupeKey: `group_goal_completed:${groupId}:${updatedGoal.id}:${updatedGoal.period_key}`
      });
    }
    completed.push(updatedProgress);
  }
  return completed;
};

export const getNicknameTotalScore = (nickname: string): number => {
  const row = db
    .prepare(
      `
        SELECT COALESCE(SUM(fish_power_score), 0) AS total_score
        FROM slacking_records
        WHERE nickname = ?
          AND status != 'rejected'
      `
    )
    .get(nickname) as { total_score: number };
  return Number(row.total_score ?? 0);
};

export const getUserTotalScore = (userId: number): number => {
  const row = db
    .prepare(
      `
        SELECT COALESCE(SUM(fish_power_score), 0) AS total_score
        FROM slacking_records
        WHERE user_id = ?
          AND status != 'rejected'
      `
    )
    .get(userId) as { total_score: number };
  return Number(row.total_score ?? 0);
};

export const listAiPrompts = (): StoredAiPrompt[] =>
  db.prepare('SELECT * FROM ai_prompts ORDER BY key ASC, version DESC').all() as StoredAiPrompt[];

export const getAiPrompt = (key: string): StoredAiPrompt | undefined =>
  db.prepare('SELECT * FROM ai_prompts WHERE key = ? LIMIT 1').get(key) as StoredAiPrompt | undefined;

export const getActiveAiPrompt = (key = AI_JUDGE_PROMPT_KEY): StoredAiPrompt | undefined =>
  db.prepare('SELECT * FROM ai_prompts WHERE key = ? AND is_active = 1 LIMIT 1').get(key) as StoredAiPrompt | undefined;

export const updateAiPromptLastTested = (key: string, now = new Date().toISOString()): void => {
  db.prepare('UPDATE ai_prompts SET last_tested_at = ?, updated_at = updated_at WHERE key = ?').run(now, key);
};

export const saveAiPrompt = (input: {
  key: string;
  name?: string;
  content: string;
  description?: string;
  isActive?: boolean;
  updatedBy: string;
}): StoredAiPrompt => {
  const now = new Date().toISOString();
  const existing = getAiPrompt(input.key);
  if (!existing) {
    db.prepare(
      `
        INSERT INTO ai_prompts (
          key,
          name,
          content,
          description,
          version,
          is_active,
          created_at,
          updated_at,
          updated_by,
          last_tested_at
        ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, '')
      `
    ).run(
      input.key,
      input.name ?? input.key,
      input.content,
      input.description ?? '',
      input.isActive === false ? 0 : 1,
      now,
      now,
      input.updatedBy
    );
  } else {
    db.prepare(
      `
        UPDATE ai_prompts
        SET name = ?,
            content = ?,
            description = ?,
            version = version + 1,
            is_active = ?,
            updated_at = ?,
            updated_by = ?
        WHERE key = ?
      `
    ).run(
      input.name ?? existing.name,
      input.content,
      input.description ?? existing.description,
      input.isActive === undefined ? existing.is_active : input.isActive ? 1 : 0,
      now,
      input.updatedBy,
      input.key
    );
  }

  return getAiPrompt(input.key) as StoredAiPrompt;
};

export const restoreDefaultAiPrompt = (updatedBy: string): StoredAiPrompt => {
  const existing = getAiPrompt(AI_JUDGE_PROMPT_KEY);
  const now = new Date().toISOString();
  if (!existing) {
    return saveAiPrompt({
      key: AI_JUDGE_PROMPT_KEY,
      name: AI_JUDGE_PROMPT_NAME,
      content: DEFAULT_AI_JUDGE_SYSTEM_PROMPT,
      description: 'DeepSeek AI 裁判结构化输出与毒舌评语系统提示词',
      isActive: true,
      updatedBy
    });
  }

  db.prepare(
    `
      UPDATE ai_prompts
      SET name = ?,
          content = ?,
          description = ?,
          version = version + 1,
          is_active = 1,
          updated_at = ?,
          updated_by = ?
      WHERE key = ?
    `
  ).run(
    AI_JUDGE_PROMPT_NAME,
    DEFAULT_AI_JUDGE_SYSTEM_PROMPT,
    'DeepSeek AI 裁判结构化输出与毒舌评语系统提示词',
    now,
    updatedBy,
    AI_JUDGE_PROMPT_KEY
  );
  return getAiPrompt(AI_JUDGE_PROMPT_KEY) as StoredAiPrompt;
};

export const insertRecord = (
  input: {
    userId?: number | null;
    nickname: string;
    slackingType: string;
    slackingTypeId: string;
    slackingTypeGroup: string;
    activityText: string;
    activityTags?: string[];
    duration: string;
    risk: string;
    disguise: string;
    creativity: string;
    description: string;
    storyText?: string;
    title: string;
    systemComment: string;
    status: 'approved' | 'pending';
    reviewNote: string;
    visibility?: 'public' | 'private';
    guildId?: number | null;
    groupIds?: number[];
    topics?: string[];
    autoCircles?: boolean;
    createdAt: string;
  },
  score: ScoreBreakdown
): StoredRecord => {
  const activityText = input.activityText.trim();
  const storyText = (input.storyText ?? input.description).trim();
  const storedScore = normalizeScoreBreakdownForStorage(score);
  const circleSlugs = input.activityTags ?? getCircleSlugsForRecord({
    activityText,
    storyText,
    topics: input.topics,
    slackingType: input.slackingTypeId,
    risk: input.risk,
    disguise: input.disguise,
    creativity: input.creativity
  });
  const insert = db.prepare(`
    INSERT INTO slacking_records (
      user_id,
      nickname,
      slacking_type,
      slacking_type_id,
      slacking_type_group,
      activity_text,
      activity_tags,
      duration,
      risk,
      disguise,
      creativity,
      description,
      story_text,
      base_score,
      duration_score,
      duration_base_score,
      duration_multiplier,
      risk_multiplier,
      disguise_bonus,
      creativity_bonus,
      fish_power_score,
      score_version,
      score_breakdown,
      title,
      system_comment,
      status,
      review_note,
      visibility,
      guild_id,
      guild_contribution,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const guildContribution = input.guildId ? Number((storedScore.fishPowerScore * 0.3).toFixed(1)) : 0;

  const result = insert.run(
    input.userId ?? null,
    input.nickname,
    input.slackingType,
    input.slackingTypeId,
    input.slackingTypeGroup,
    activityText,
    JSON.stringify(circleSlugs),
    input.duration,
    input.risk,
    input.disguise,
    input.creativity,
    storyText,
    storyText,
    storedScore.baseScore,
    storedScore.durationScore,
    storedScore.durationBaseScore,
    storedScore.durationMultiplier,
    storedScore.riskMultiplier,
    storedScore.disguiseBonus,
    storedScore.creativityBonus,
    storedScore.fishPowerScore,
    storedScore.scoreVersion,
    JSON.stringify(storedScore),
    input.title,
    input.systemComment,
    input.status,
    input.reviewNote,
    input.visibility ?? 'public',
    input.guildId ?? null,
    guildContribution,
    input.createdAt,
    input.createdAt
  );

  const recordId = Number(result.lastInsertRowid);
  if (input.autoCircles ?? true) {
    assignRecordToCircles(recordId, {
      activityText,
      storyText,
      topics: input.topics,
      slackingType: input.slackingTypeId,
      risk: input.risk,
      disguise: input.disguise,
      creativity: input.creativity
    });
  }
  for (const groupId of input.groupIds ?? []) {
    db.prepare('INSERT OR IGNORE INTO record_groups (record_id, group_id, shared_at) VALUES (?, ?, ?)').run(recordId, groupId, input.createdAt);
  }
  assignRecordTopics(recordId, input.topics ?? [], input.createdAt);
  refreshAllSocialAggregates();
  return db.prepare('SELECT * FROM slacking_records WHERE id = ?').get(recordId) as StoredRecord;
};

const uniqueTopicSlug = (baseSlug: string, excludeId?: number): string => {
  const fallback = baseSlug || `topic-${Date.now().toString(36)}`;
  let slug = fallback;
  let index = 2;
  const exists = excludeId
    ? db.prepare('SELECT id FROM topics WHERE slug = ? AND id != ?')
    : db.prepare('SELECT id FROM topics WHERE slug = ?');
  while (excludeId ? exists.get(slug, excludeId) : exists.get(slug)) {
    slug = `${fallback}-${index}`;
    index += 1;
  }
  return slug;
};

export const getRecordTopics = (recordId: number, includeHidden = false): StoredTopic[] => {
  const rows = db
    .prepare(
      `
        SELECT topics.*
        FROM record_topics
        JOIN topics ON topics.id = record_topics.topic_id
        WHERE record_topics.record_id = ?
          AND (? = 1 OR topics.status = 'active')
        ORDER BY record_topics.id ASC
      `
    )
    .all(recordId, includeHidden ? 1 : 0) as StoredTopic[];
  return rows;
};

export const getPopularTopics = (limit = 12): StoredTopic[] =>
  db
    .prepare(
      `
        SELECT *
        FROM topics
        WHERE status = 'active'
          AND usage_count > 0
        ORDER BY usage_count DESC, updated_at DESC, id ASC
        LIMIT ?
      `
    )
    .all(limit) as StoredTopic[];

export const upsertTopic = (name: string, now: string): StoredTopic => {
  const slugBase = createTopicSlug(name);
  const existing = db
    .prepare('SELECT * FROM topics WHERE lower(name) = lower(?) OR slug = ? LIMIT 1')
    .get(name, slugBase) as StoredTopic | undefined;
  if (existing) return existing;

  const slug = uniqueTopicSlug(slugBase);
  const result = db
    .prepare('INSERT INTO topics (name, slug, usage_count, status, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?)')
    .run(name, slug, 'active', now, now);
  return db.prepare('SELECT * FROM topics WHERE id = ?').get(Number(result.lastInsertRowid)) as StoredTopic;
};

export const assignRecordTopics = (recordId: number, topicNames: string[], now: string): void => {
  if (!topicNames.length) return;
  const insert = db.prepare('INSERT OR IGNORE INTO record_topics (record_id, topic_id, created_at) VALUES (?, ?, ?)');
  const increment = db.prepare('UPDATE topics SET usage_count = usage_count + 1, updated_at = ? WHERE id = ?');

  for (const topicName of topicNames) {
    const topic = upsertTopic(topicName, now);
    const result = insert.run(recordId, topic.id, now);
    if (Number(result.changes ?? 0) > 0) {
      increment.run(now, topic.id);
    }
  }
};

export const makeUniqueTopicSlug = (name: string, excludeId?: number): string => uniqueTopicSlug(createTopicSlug(name), excludeId);

export const assignRecordToCircles = (
  recordId: number,
  input: {
    activityText?: string;
    storyText?: string;
    topics?: string[];
    slackingType?: string;
    risk?: string;
    disguise?: string;
    creativity?: string;
    legendNominations?: number;
  }
): void => {
  const slugs = getCircleSlugsForRecord(input);
  const selectCircle = db.prepare('SELECT id FROM circles WHERE slug = ?');
  const insert = db.prepare('INSERT OR IGNORE INTO record_circles (record_id, circle_id) VALUES (?, ?)');
  for (const slug of slugs) {
    const circle = selectCircle.get(slug) as { id: number } | undefined;
    if (circle) insert.run(recordId, circle.id);
  }
};

export const syncRecordSocialCounts = (recordId: number): void => {
  const likes = db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM (
          SELECT user_id
          FROM record_interactions
          WHERE record_id = ?
            AND action = 'like'
          UNION
          SELECT user_id
          FROM reactions
          WHERE target_type = 'record'
            AND target_id = ?
            AND reaction_type = 'like'
        )
      `
    )
    .get(recordId, recordId) as { count: number };
  const favorites = db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM record_interactions
        WHERE record_id = ?
          AND action = 'favorite'
      `
    )
    .get(recordId) as { count: number };
  const legends = db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM (
          SELECT user_id
          FROM record_interactions
          WHERE record_id = ?
            AND action = 'vote'
          UNION
          SELECT user_id
          FROM reactions
          WHERE target_type = 'record'
            AND target_id = ?
            AND reaction_type = 'legend'
        )
      `
    )
    .get(recordId, recordId) as { count: number };
  const comments = db
    .prepare("SELECT COUNT(*) AS count FROM comments WHERE record_id = ? AND status = 'approved'")
    .get(recordId) as { count: number };
  const reports = db.prepare("SELECT COUNT(*) AS count FROM reports WHERE target_type = 'record' AND target_id = ?").get(recordId) as { count: number };

  const likeCount = Number(likes.count ?? 0);
  const legendCount = Number(legends.count ?? 0);
  const commentCount = Number(comments.count ?? 0);
  const hotBonus = likeCount + commentCount * 2 + legendCount * 8 >= 10 ? 20 : 0;

  const record = db.prepare('SELECT fish_power_score, guild_id, user_id FROM slacking_records WHERE id = ?').get(recordId) as
    | { fish_power_score: number; guild_id: number | null; user_id: number | null }
    | undefined;
  const guildContribution = record?.guild_id ? Number((Number(record.fish_power_score) * 0.3 + likeCount + commentCount * 2 + legendCount * 10 + hotBonus).toFixed(1)) : 0;

  db.prepare(
    `
      UPDATE slacking_records
      SET like_count = ?,
          favorite_count = ?,
          vote_count = ?,
          legend_nomination_count = ?,
          report_count = ?,
          comment_count = ?,
          guild_contribution = ?,
          updated_at = ?
      WHERE id = ?
    `
  ).run(
    likeCount,
    Number(favorites.count ?? 0),
    legendCount,
    legendCount,
    Number(reports.count ?? 0),
    commentCount,
    guildContribution,
    new Date().toISOString(),
    recordId
  );
  if (legendCount > 0 && record) {
    const typeRow = db.prepare('SELECT slacking_type, slacking_type_id, activity_text FROM slacking_records WHERE id = ?').get(recordId) as {
      slacking_type: string;
      slacking_type_id: string;
      activity_text: string;
    };
    assignRecordToCircles(recordId, {
      activityText: String(typeRow.activity_text || typeRow.slacking_type || ''),
      slackingType: String(typeRow.slacking_type_id || findSlackingTypeOption(typeRow.slacking_type)?.id || typeRow.slacking_type),
      risk: String((db.prepare('SELECT risk FROM slacking_records WHERE id = ?').get(recordId) as { risk: string }).risk),
      disguise: String((db.prepare('SELECT disguise FROM slacking_records WHERE id = ?').get(recordId) as { disguise: string }).disguise),
      creativity: String((db.prepare('SELECT creativity FROM slacking_records WHERE id = ?').get(recordId) as { creativity: string }).creativity),
      legendNominations: legendCount
    });
  }
  if (hotBonus > 0) {
    grantHotRecordFishScale(recordId);
  }
  refreshAllSocialAggregates();
};

export const getRecordTodayRank = (
  record: Pick<StoredRecord, 'created_at' | 'fish_power_score'>,
  period: { start: string; end: string }
): number => {
  const row = db
    .prepare(
      `
        SELECT COUNT(*) + 1 AS rank
        FROM slacking_records
        WHERE created_at >= ?
          AND created_at < ?
          AND status = 'approved'
          AND fish_power_score > ?
      `
    )
    .get(period.start, period.end, record.fish_power_score) as { rank: number };
  return Number(row.rank);
};

export const refreshRecordInteractionCounts = (recordId: number): void => {
  syncRecordSocialCounts(recordId);
};
