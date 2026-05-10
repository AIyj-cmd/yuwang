import bcrypt from 'bcryptjs';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { db } from './database.js';

const ADMIN_COOKIE_NAME = 'gongwei_yuwang_admin_session';
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;

export type AdminSession = {
  username: string;
  expiresAt: string;
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
    cookies[name] = decodeURIComponent(value.join('='));
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
  const payload = Buffer.from(
    JSON.stringify({
      username,
      iat: now,
      exp: now + ADMIN_SESSION_TTL_SECONDS,
      nonce: randomBytes(12).toString('hex')
    })
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
};

export const getAdminSession = (request: FastifyRequest): AdminSession | null => {
  if (!isAdminConfigured()) return null;
  const token = parseCookies(request.headers.cookie)[ADMIN_COOKIE_NAME];
  if (!token || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      username?: string;
      exp?: number;
    };
    if (decoded.username !== adminConfig().username || !decoded.exp || decoded.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return {
      username: decoded.username,
      expiresAt: new Date(decoded.exp * 1000).toISOString()
    };
  } catch {
    return null;
  }
};

export const verifyAdminCredentials = async (username: string, password: string): Promise<boolean> => {
  if (!isAdminConfigured()) return false;
  const config = adminConfig();
  if (username !== config.username) return false;
  return bcrypt.compare(password, config.passwordHash);
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
