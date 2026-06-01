import type { FastifyReply, FastifyRequest } from 'fastify';

type RateLimitOptions = {
  bucket: string;
  max: number;
  windowMs: number;
  subject?: string | null;
  subjectMax?: number;
  subjectWindowMs?: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 5000;
const CLEANUP_EVERY_REQUESTS = 100;
let requestsSinceCleanup = 0;

const clientKey = (request: FastifyRequest): string => {
  // Do not parse X-Forwarded-For here. By default it is client-controlled.
  // When TRUST_PROXY is explicitly configured, Fastify folds trusted proxy
  // headers into request.ip; this limiter should only consume that value.
  return (request.ip || 'unknown').trim();
};

const normalizeSubject = (value: string | null | undefined): string => value?.trim().toLowerCase().slice(0, 120) ?? '';

const cleanupBuckets = (now: number): void => {
  requestsSinceCleanup += 1;
  if (requestsSinceCleanup < CLEANUP_EVERY_REQUESTS && buckets.size <= MAX_BUCKETS) return;
  requestsSinceCleanup = 0;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }

  if (buckets.size <= MAX_BUCKETS) return;
  const overflow = buckets.size - MAX_BUCKETS;
  const oldestKeys = [...buckets.entries()]
    .sort((left, right) => left[1].resetAt - right[1].resetAt)
    .slice(0, overflow)
    .map(([key]) => key);
  for (const key of oldestKeys) buckets.delete(key);
};

export const rateLimitRequest = (request: FastifyRequest, reply: FastifyReply, options: RateLimitOptions): boolean => {
  const now = Date.now();
  cleanupBuckets(now);

  const client = clientKey(request);
  const subject = normalizeSubject(options.subject);
  const checks = [
    { key: `${options.bucket}:ip:${client}`, max: options.max, windowMs: options.windowMs },
    ...(subject
      ? [
          {
            key: `${options.bucket}:subject:${subject}`,
            max: options.subjectMax ?? options.max,
            windowMs: options.subjectWindowMs ?? options.windowMs
          }
        ]
      : [])
  ];

  let retryAfterSeconds = 0;
  for (const check of checks) {
    const existing = buckets.get(check.key);
    const current = existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + check.windowMs };
    current.count += 1;
    buckets.set(check.key, current);

    if (current.count > check.max) {
      retryAfterSeconds = Math.max(retryAfterSeconds, Math.max(1, Math.ceil((current.resetAt - now) / 1000)));
    }
  }

  if (retryAfterSeconds <= 0) return true;

  reply.header('Retry-After', String(retryAfterSeconds));
  reply.code(429).send({ message: '请求过于频繁，请稍后再试。' });
  return false;
};
