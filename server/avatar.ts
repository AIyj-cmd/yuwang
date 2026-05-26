import type { FastifyRequest } from 'fastify';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { db, runInTransaction } from './database.js';
import { getTodayRange } from './time.js';

export const AVATAR_UPLOAD_DIR = resolve(process.cwd(), 'data', 'uploads', 'avatars');
export const AVATAR_URL_PREFIX = '/uploads/avatars/';
export const AVATAR_MAX_SIZE_BYTES = 1024 * 1024;
export const AVATAR_MAX_UPLOADS_PER_DAY = 5;
export const AVATAR_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AVATAR_ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;

type AvatarMimeType = (typeof AVATAR_ALLOWED_MIME_TYPES)[number];
type AvatarFormat = {
  mimeType: AvatarMimeType;
  storageExtension: '.jpg' | '.png' | '.webp';
  allowedExtensions: readonly string[];
};

type AvatarFile = {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  format: AvatarFormat;
};

export class AvatarUploadError extends Error {
  statusCode: number;
  reason: string;

  constructor(statusCode: number, reason: string, message = reason) {
    super(message);
    this.name = 'AvatarUploadError';
    this.statusCode = statusCode;
    this.reason = reason;
  }
}

export const avatarPolicy = () => ({
  maxSizeBytes: AVATAR_MAX_SIZE_BYTES,
  allowedMimeTypes: [...AVATAR_ALLOWED_MIME_TYPES],
  allowedExtensions: [...AVATAR_ALLOWED_EXTENSIONS],
  maxUploadsPerDay: AVATAR_MAX_UPLOADS_PER_DAY
});

export const ensureAvatarUploadDir = (): void => {
  mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
};

const errorCode = (error: unknown): string => {
  if (!error || typeof error !== 'object' || !('code' in error)) return '';
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : '';
};

const detectAvatarFormat = (buffer: Buffer): AvatarFormat | null => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', storageExtension: '.jpg', allowedExtensions: ['.jpg', '.jpeg'] };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: 'image/png', storageExtension: '.png', allowedExtensions: ['.png'] };
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { mimeType: 'image/webp', storageExtension: '.webp', allowedExtensions: ['.webp'] };
  }
  return null;
};

const mapMultipartError = (error: unknown): AvatarUploadError => {
  const code = errorCode(error);
  if (code.includes('FILE_TOO_LARGE') || code.includes('REQ_FILE_TOO_LARGE')) {
    return new AvatarUploadError(413, 'file_too_large', 'Avatar file must be 1MB or smaller.');
  }
  if (code.includes('FILES_LIMIT')) {
    return new AvatarUploadError(400, 'too_many_files', 'Only one avatar file is allowed.');
  }
  if (code.includes('FIELDS_LIMIT')) {
    return new AvatarUploadError(400, 'unexpected_field', 'Only the avatar file field is allowed.');
  }
  if (code.includes('PARTS_LIMIT')) {
    return new AvatarUploadError(400, 'too_many_parts', 'Only one avatar multipart part is allowed.');
  }
  return new AvatarUploadError(400, 'invalid_multipart', 'Invalid avatar multipart payload.');
};

const validateAvatarFile = (input: { buffer: Buffer; filename: string; mimetype: string }): AvatarFile => {
  const mimetype = input.mimetype.toLowerCase();
  const extension = extname(input.filename).toLowerCase();
  if (!AVATAR_ALLOWED_MIME_TYPES.includes(mimetype as AvatarMimeType)) {
    throw new AvatarUploadError(400, 'invalid_mime_type', 'Avatar must be jpg, png, or webp.');
  }
  if (!AVATAR_ALLOWED_EXTENSIONS.includes(extension as (typeof AVATAR_ALLOWED_EXTENSIONS)[number])) {
    throw new AvatarUploadError(400, 'invalid_extension', 'Avatar file extension must be .jpg, .jpeg, .png, or .webp.');
  }
  if (input.buffer.length === 0) {
    throw new AvatarUploadError(400, 'empty_file', 'Avatar file cannot be empty.');
  }
  if (input.buffer.length > AVATAR_MAX_SIZE_BYTES) {
    throw new AvatarUploadError(413, 'file_too_large', 'Avatar file must be 1MB or smaller.');
  }

  const format = detectAvatarFormat(input.buffer);
  if (!format) {
    throw new AvatarUploadError(400, 'invalid_magic_number', 'Avatar image bytes are not jpg, png, or webp.');
  }
  if (format.mimeType !== mimetype) {
    throw new AvatarUploadError(400, 'mime_magic_mismatch', 'Avatar MIME type does not match image bytes.');
  }
  if (!format.allowedExtensions.includes(extension)) {
    throw new AvatarUploadError(400, 'extension_magic_mismatch', 'Avatar extension does not match image bytes.');
  }

  return {
    buffer: input.buffer,
    filename: input.filename,
    mimetype,
    format
  };
};

const readAvatarMultipartFile = async (request: FastifyRequest): Promise<AvatarFile> => {
  let file:
    | {
        buffer: Buffer;
        filename: string;
        mimetype: string;
      }
    | null = null;

  try {
    for await (const part of request.parts({
      limits: {
        fileSize: AVATAR_MAX_SIZE_BYTES,
        files: 1,
        fields: 0,
        parts: 1
      }
    })) {
      if (part.type !== 'file') {
        throw new AvatarUploadError(400, 'unexpected_field', 'Only the avatar file field is allowed.');
      }
      if (part.fieldname !== 'avatar') {
        await part.toBuffer().catch(() => Buffer.alloc(0));
        throw new AvatarUploadError(400, 'invalid_field_name', 'Avatar file field must be named avatar.');
      }
      if (file) {
        await part.toBuffer().catch(() => Buffer.alloc(0));
        throw new AvatarUploadError(400, 'too_many_files', 'Only one avatar file is allowed.');
      }
      const buffer = await part.toBuffer();
      if ((part.file as { truncated?: boolean }).truncated) {
        throw new AvatarUploadError(413, 'file_too_large', 'Avatar file must be 1MB or smaller.');
      }
      file = {
        buffer,
        filename: part.filename,
        mimetype: part.mimetype
      };
    }
  } catch (error) {
    if (error instanceof AvatarUploadError) throw error;
    throw mapMultipartError(error);
  }

  if (!file) {
    throw new AvatarUploadError(400, 'missing_avatar', 'Avatar file is required.');
  }
  return validateAvatarFile(file);
};

export const recordAvatarUploadAttempt = (userId: number, status: string, reason = ''): void => {
  try {
    db.prepare('INSERT INTO avatar_upload_attempts (user_id, status, reason, created_at) VALUES (?, ?, ?, ?)').run(
      userId,
      status,
      reason,
      new Date().toISOString()
    );
  } catch (error) {
    console.warn('[avatar] failed to write upload attempt:', error);
  }
};

const countSuccessfulAvatarUploadsToday = (userId: number): number => {
  const today = getTodayRange();
  const row = db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM avatar_upload_attempts
        WHERE user_id = ?
          AND status = 'success'
          AND created_at >= ?
          AND created_at < ?
      `
    )
    .get(userId, today.start, today.end) as { count: number };
  return Number(row.count ?? 0);
};

const storageKeyToPath = (storageKey: string): string | null => {
  const key = storageKey.trim();
  if (!key || !/^[A-Za-z0-9._-]+$/.test(key)) return null;
  const root = resolve(AVATAR_UPLOAD_DIR);
  const target = resolve(root, key);
  return target.startsWith(`${root}${sep}`) ? target : null;
};

export const safeDeleteAvatarFile = (storageKey: string): void => {
  const target = storageKeyToPath(storageKey);
  if (!target || !existsSync(target)) return;
  try {
    unlinkSync(target);
  } catch (error) {
    if (errorCode(error) !== 'ENOENT') {
      console.warn('[avatar] failed to delete old avatar file:', error);
    }
  }
};

const writeAvatarFile = (file: AvatarFile): { storageKey: string; avatarUrl: string } => {
  ensureAvatarUploadDir();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const storageKey = `${randomBytes(24).toString('hex')}${file.format.storageExtension}`;
    const target = storageKeyToPath(storageKey);
    if (!target) continue;
    try {
      writeFileSync(target, file.buffer, { flag: 'wx' });
      return { storageKey, avatarUrl: `${AVATAR_URL_PREFIX}${storageKey}` };
    } catch (error) {
      if (errorCode(error) === 'EEXIST') continue;
      throw error;
    }
  }
  throw new Error('Unable to allocate avatar storage key.');
};

const replaceUserAvatar = (userId: number, file: AvatarFile): { avatarUrl: string; storageKey: string } => {
  const next = writeAvatarFile(file);
  const now = new Date().toISOString();
  let oldStorageKey = '';

  try {
    runInTransaction(() => {
      const before = db.prepare('SELECT avatar_storage_key FROM users WHERE id = ?').get(userId) as
        | { avatar_storage_key: string }
        | undefined;
      if (!before) {
        throw new AvatarUploadError(404, 'user_not_found', 'User not found.');
      }
      oldStorageKey = String(before.avatar_storage_key ?? '');
      db.prepare(
        `
          UPDATE users
          SET avatar_url = ?,
              avatar_storage_key = ?,
              avatar_status = 'active',
              avatar_updated_at = ?,
              updated_at = ?
          WHERE id = ?
        `
      ).run(next.avatarUrl, next.storageKey, now, now, userId);
      db.prepare(
        `
          INSERT INTO user_avatar_events (
            user_id,
            action,
            old_avatar_storage_key,
            new_avatar_storage_key,
            reason,
            actor_type,
            actor_id,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run(userId, 'upload', oldStorageKey, next.storageKey, '', 'user', userId, now);
      db.prepare('INSERT INTO avatar_upload_attempts (user_id, status, reason, created_at) VALUES (?, ?, ?, ?)').run(userId, 'success', '', now);
    });
  } catch (error) {
    safeDeleteAvatarFile(next.storageKey);
    recordAvatarUploadAttempt(userId, 'failed', error instanceof AvatarUploadError ? error.reason : 'db_update_failed');
    throw error;
  }

  safeDeleteAvatarFile(oldStorageKey);
  return next;
};

export const uploadUserAvatar = async (userId: number, request: FastifyRequest): Promise<{ avatarUrl: string; storageKey: string }> => {
  if (!request.isMultipart()) {
    recordAvatarUploadAttempt(userId, 'rejected', 'not_multipart');
    throw new AvatarUploadError(400, 'not_multipart', 'Avatar upload must use multipart/form-data.');
  }

  if (countSuccessfulAvatarUploadsToday(userId) >= AVATAR_MAX_UPLOADS_PER_DAY) {
    recordAvatarUploadAttempt(userId, 'rejected', 'daily_limit');
    throw new AvatarUploadError(429, 'daily_limit', 'Daily avatar upload limit reached.');
  }

  let file: AvatarFile;
  try {
    file = await readAvatarMultipartFile(request);
  } catch (error) {
    if (error instanceof AvatarUploadError) {
      recordAvatarUploadAttempt(userId, 'rejected', error.reason);
    }
    throw error;
  }

  return replaceUserAvatar(userId, file);
};

export const clearUserAvatar = (input: {
  userId: number;
  action: 'remove' | 'admin_remove';
  avatarStatus: 'removed' | 'admin_removed';
  actorType: 'user' | 'admin';
  actorId: number | null;
  reason?: string;
}): boolean => {
  const now = new Date().toISOString();
  let oldStorageKey = '';

  try {
    const removed = runInTransaction(() => {
      const before = db.prepare('SELECT avatar_storage_key FROM users WHERE id = ?').get(input.userId) as
        | { avatar_storage_key: string }
        | undefined;
      if (!before) {
        return false;
      }
      oldStorageKey = String(before.avatar_storage_key ?? '');
      db.prepare(
        `
          UPDATE users
          SET avatar_url = '',
              avatar_storage_key = '',
              avatar_status = ?,
              avatar_updated_at = ?,
              updated_at = ?
          WHERE id = ?
        `
      ).run(input.avatarStatus, now, now, input.userId);
      db.prepare(
        `
          INSERT INTO user_avatar_events (
            user_id,
            action,
            old_avatar_storage_key,
            new_avatar_storage_key,
            reason,
            actor_type,
            actor_id,
            created_at
          ) VALUES (?, ?, ?, '', ?, ?, ?, ?)
        `
      ).run(input.userId, input.action, oldStorageKey, input.reason ?? '', input.actorType, input.actorId, now);
      return true;
    });
    if (!removed) return false;
  } catch (error) {
    throw error;
  }

  safeDeleteAvatarFile(oldStorageKey);
  return true;
};
