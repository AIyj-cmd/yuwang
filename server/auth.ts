import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { db } from './database.js';

export type AuthUser = {
  id: number;
  username: string;
  displayName: string;
  bio: string;
  locale: string;
  avatarSeed: string;
  avatarUrl: string;
  isAdmin: boolean;
  status: string;
  muteUntil: string;
  banReason: string;
  guildId: number | null;
  createdAt: string;
};

const toPublicUser = (row: Record<string, unknown>): AuthUser => ({
  id: Number(row.id),
  username: String(row.username),
  displayName: String(row.display_name),
  bio: String(row.bio ?? ''),
  locale: String(row.locale ?? 'zh-CN'),
  avatarSeed: String(row.avatar_seed ?? ''),
  avatarUrl: String(row.avatar_url ?? ''),
  isAdmin: Boolean(row.is_admin),
  status: String(row.status ?? 'active'),
  muteUntil: String(row.mute_until ?? ''),
  banReason: String(row.ban_reason ?? ''),
  guildId: row.guild_id === null || row.guild_id === undefined ? null : Number(row.guild_id),
  createdAt: String(row.created_at)
});

const hashPassword = (password: string, salt = randomBytes(16).toString('hex')) => ({
  salt,
  hash: scryptSync(password, salt, 64).toString('hex')
});

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
const DUMMY_PASSWORD_SALT = '00000000000000000000000000000000';
const DUMMY_PASSWORD_HASH = hashPassword('dummy-password', DUMMY_PASSWORD_SALT).hash;

export const createUser = (input: {
  username: string;
  password: string;
  displayName: string;
  locale?: string;
}): { user: AuthUser; token: string } => {
  const now = new Date().toISOString();
  const password = hashPassword(input.password);
  const result = db
    .prepare(
      `
        INSERT INTO users (username, display_name, password_hash, password_salt, locale, is_admin, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      input.username,
      input.displayName,
      password.hash,
      password.salt,
      input.locale ?? 'zh-CN',
      0,
      now,
      now
    );

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>;
  const user = toPublicUser(row);
  const token = createSession(user.id);
  return { user, token };
};

export const verifyUser = (username: string, password: string): { user: AuthUser; token: string } | null => {
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as Record<string, unknown> | undefined;

  const expected = Buffer.from(String(row?.password_hash ?? DUMMY_PASSWORD_HASH), 'hex');
  const actual = Buffer.from(hashPassword(password, String(row?.password_salt ?? DUMMY_PASSWORD_SALT)).hash, 'hex');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  if (!row) return null;

  const user = toPublicUser(row);
  const token = createSession(user.id);
  return { user, token };
};

export const createSession = (userId: number): string => {
  const token = randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30).toISOString();
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at <= ?').run(userId, now.toISOString());
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    hashToken(token),
    userId,
    expiresAt,
    now.toISOString()
  );
  return token;
};

export const getUserFromRequest = (request: FastifyRequest): AuthUser | null => {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return null;

  const token = authorization.slice('Bearer '.length).trim();
  const row = db
    .prepare(
      `
        SELECT users.*
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ?
          AND sessions.expires_at > ?
      `
    )
    .get(hashToken(token), new Date().toISOString()) as Record<string, unknown> | undefined;

  return row ? toPublicUser(row) : null;
};

export const requireAuth = (request: FastifyRequest, reply: FastifyReply): AuthUser | null => {
  const user = getUserFromRequest(request);
  if (!user) {
    reply.code(401).send({ message: '请先登录。' });
    return null;
  }
  if (user.status === 'banned') {
    reply.code(403).send({ message: '账号当前不可用。' });
    return null;
  }
  return user;
};

export const isMuted = (user: AuthUser): boolean => {
  if (user.status !== 'muted') return false;
  if (!user.muteUntil) return true;
  return new Date(user.muteUntil).getTime() > Date.now();
};

export const requireAdmin = (request: FastifyRequest, reply: FastifyReply): AuthUser | null => {
  const user = requireAuth(request, reply);
  if (!user) return null;
  if (!user.isAdmin) {
    reply.code(403).send({ message: '需要管理员权限。' });
    return null;
  }
  return user;
};

export const publicUserById = (id: number): AuthUser | null => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? toPublicUser(row) : null;
};
