import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { AVATAR_MAX_SIZE_BYTES, AVATAR_UPLOAD_DIR, AVATAR_URL_PREFIX, ensureAvatarUploadDir } from './avatar.js';
import { initDatabase } from './database.js';
import { registerRoutes } from './routes.js';

const parseTrustProxy = (): boolean | string[] => {
  const value = (process.env.TRUST_PROXY ?? '').trim();
  if (!value || ['false', '0', 'no'].includes(value.toLowerCase())) return false;
  if (['true', '1', 'yes'].includes(value.toLowerCase())) return true;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info'
  },
  trustProxy: parseTrustProxy()
});

const parseAllowedOrigins = (): Set<string> => {
  const configured = (process.env.CORS_ORIGINS ?? process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const viteDevOrigins = Array.from({ length: 7 }, (_, index) => 5173 + index).flatMap((port) => [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`
  ]);
  const vitePreviewOrigins = Array.from({ length: 7 }, (_, index) => 4173 + index).flatMap((port) => [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`
  ]);
  const localDevelopmentOrigins =
    process.env.NODE_ENV === 'production'
      ? []
      : [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://localhost:3001',
          'http://127.0.0.1:3001',
          'http://localhost:3101',
          'http://127.0.0.1:3101',
          ...viteDevOrigins,
          ...vitePreviewOrigins
        ];
  return new Set([...configured, ...localDevelopmentOrigins]);
};

const allowedOrigins = parseAllowedOrigins();
await app.register(cors, {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin is not allowed by CORS'), false);
  },
  credentials: true
});

ensureAvatarUploadDir();
await app.register(multipart, {
  limits: {
    fileSize: AVATAR_MAX_SIZE_BYTES,
    files: 1,
    fields: 0,
    parts: 1
  },
  throwFileSizeLimit: true
});
await app.register(fastifyStatic, {
  root: AVATAR_UPLOAD_DIR,
  prefix: AVATAR_URL_PREFIX,
  decorateReply: false
});

initDatabase();
await registerRoutes(app);

const distRoot = resolve(process.cwd(), 'dist');
if (existsSync(distRoot)) {
  await app.register(fastifyStatic, {
    root: distRoot,
    prefix: '/'
  });

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.code(404).send({ message: 'API route not found' });
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      return reply.type('text/html').sendFile('index.html');
    }

    return reply.code(404).send({ message: 'Route not found' });
  });
}

const port = Number(process.env.PORT ?? 3101);
const host = process.env.HOST ?? '127.0.0.1';

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
