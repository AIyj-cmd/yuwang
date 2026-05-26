import bcrypt from 'bcryptjs';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { db } from './database.js';

const ADMIN_COOKIE_NAME = 'gongwei_yuwang_admin_session';
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;

export type AdminSession = {
  username: string;
  expiresAt: string;
  tokenHash: string;
};

const adminConfig = () => ({
  username: process.env.ADMIN_USERNAME ?? '',
  passwordHash: process.env.ADMIN_PASSWORD_HASH ?? '',
  sessionSecret: process.env.ADMIN_SESSION_SECRET ?? ''
});

const isAdminConfigured = (): boolean => {
  const config = adminConfig();
  return Boolean(config.username && config.passwordHash && config.sessionSecret);
};

const sign = (payload: string): string => createHmac('sha256', adminConfig().sessionSecret).update(payload).digest('base64url');
const hashAdminToken = (token: string): string => createHash('sha256').update(token).digest('hex');

const safeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

const parseCookies = (header?: string): Record<string, string> => {
  const cookies: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (!name || value.length === 0) continue;
    try {
      cookies[name] = decodeURIComponent(value.join('='));
    } catch {
      continue;
    }
  }
  return cookies;
};

const cookieAttributes = (maxAge: number): string => {
  const secure = process.env.NODE_ENV === 'production' || process.env.ADMIN_COOKIE_SECURE === 'true';
  return [
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    secure ? 'Secure' : ''
  ]
    .filter(Boolean)
    .join('; ');
};

export const setAdminCookie = (reply: FastifyReply, token: string): void => {
  reply.header('Set-Cookie', `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieAttributes(ADMIN_SESSION_TTL_SECONDS)}`);
};

export const clearAdminCookie = (reply: FastifyReply): void => {
  reply.header('Set-Cookie', `${ADMIN_COOKIE_NAME}=; ${cookieAttributes(0)}`);
};

export const createAdminSessionToken = (username: string): string => {
  const now = Math.floor(Date.now() / 1000);
  const nonce = randomBytes(12).toString('hex');
  const expiresAt = new Date((now + ADMIN_SESSION_TTL_SECONDS) * 1000).toISOString();
  const payload = Buffer.from(
    JSON.stringify({
      username,
      iat: now,
      exp: now + ADMIN_SESSION_TTL_SECONDS,
      nonce
    })
  ).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  db.prepare("DELETE FROM admin_sessions WHERE expires_at <= ? OR revoked_at != ''").run(new Date().toISOString());
  db.prepare('INSERT INTO admin_sessions (token_hash, username, nonce, expires_at, created_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    hashAdminToken(token),
    username,
    nonce,
    expiresAt,
    new Date(now * 1000).toISOString(),
    ''
  );
  return token;
};

export const getAdminSession = (request: FastifyRequest): AdminSession | null => {
  if (!isAdminConfigured()) return null;
  const token = parseCookies(request.headers.cookie)[ADMIN_COOKIE_NAME];
  if (!token || !token.includes('.')) return null;
  const tokenParts = token.split('.');
  if (tokenParts.length !== 2) return null;
  const [payload, signature] = tokenParts;
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;

  let decoded: { username?: string; exp?: number; nonce?: string };
  try {
    decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      username?: string;
      exp?: number;
      nonce?: string;
    };
  } catch {
    return null;
  }

  if (decoded.username !== adminConfig().username || !decoded.exp || !decoded.nonce || decoded.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  const tokenHash = hashAdminToken(token);
  let stored: { expires_at: string } | undefined;
  try {
    stored = db
      .prepare(
        `
          SELECT expires_at
          FROM admin_sessions
          WHERE token_hash = ?
            AND username = ?
            AND nonce = ?
            AND revoked_at = ''
            AND expires_at > ?
          LIMIT 1
        `
      )
      .get(tokenHash, decoded.username, decoded.nonce, new Date().toISOString()) as { expires_at: string } | undefined;
  } catch (error) {
    request.log.error({ err: error }, 'failed to query admin session');
    throw error;
  }
  if (!stored) return null;
  return {
    username: decoded.username,
    expiresAt: String(stored.expires_at),
    tokenHash
  };
};

export const revokeAdminSession = (request: FastifyRequest): void => {
  const token = parseCookies(request.headers.cookie)[ADMIN_COOKIE_NAME];
  if (!token) return;
  db.prepare('UPDATE admin_sessions SET revoked_at = ? WHERE token_hash = ?').run(new Date().toISOString(), hashAdminToken(token));
};

export const verifyAdminCredentials = async (username: string, password: string): Promise<boolean> => {
  if (!isAdminConfigured()) return false;
  const config = adminConfig();
  const passwordMatches = await bcrypt.compare(password, config.passwordHash);
  return username === config.username && passwordMatches;
};

export const requireAdminSession = (request: FastifyRequest, reply: FastifyReply): AdminSession | null => {
  const session = getAdminSession(request);
  if (!session) {
    reply.code(401).send({ message: '请先登录管理后台。' });
    return null;
  }
  return session;
};

export const ensureAdminConfigured = (reply: FastifyReply): boolean => {
  if (isAdminConfigured()) return true;
  reply.code(503).send({ message: '管理后台尚未配置。请设置 ADMIN_USERNAME、ADMIN_PASSWORD_HASH 和 ADMIN_SESSION_SECRET。' });
  return false;
};

export const writeAdminAuditLog = (
  request: FastifyRequest,
  input: {
    adminUsername: string;
    action: string;
    targetType: string;
    targetId: string | number;
    before?: unknown;
    after?: unknown;
  }
): void => {
  db.prepare(
    `
      INSERT INTO admin_audit_logs (
        admin_username,
        action,
        target_type,
        target_id,
        before_json,
        after_json,
        ip,
        user_agent,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    input.adminUsername,
    input.action,
    input.targetType,
    String(input.targetId),
    input.before === undefined ? '' : JSON.stringify(input.before),
    input.after === undefined ? '' : JSON.stringify(input.after),
    request.ip,
    String(request.headers['user-agent'] ?? ''),
    new Date().toISOString()
  );
};
