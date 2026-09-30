import { redis } from '../config/redis.js';
import { env } from '../config/env.js';

export function buildRateLimitKey(userId: string, now = new Date()) {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');
  return `email-rate:${userId}:${year}${month}${day}${hour}`;
}

export async function getRateLimitStatus(userId: string, now = new Date()) {
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours()));
  const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);
  const used = Number(await redis.get(buildRateLimitKey(userId, now)) ?? 0);
  const remaining = Math.max(0, env.maxEmailsPerHour - used);

  return {
    limit: env.maxEmailsPerHour,
    used,
    remaining,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    nextAvailableAt: remaining === 0 ? windowEnd.toISOString() : null,
  };
}

export async function reserveEmailSlot(userId: string, now = new Date()) {
  const key = buildRateLimitKey(userId, now);
  const limit = env.maxEmailsPerHour;
  const secondsUntilNextHour = Math.max(
    1,
    Math.ceil((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1) - now.getTime()) / 1000),
  );
  const result = await redis.eval(
    "local count = tonumber(redis.call('GET', KEYS[1]) or '0'); local limit = tonumber(ARGV[1]); if count >= limit then return {0, count}; end; count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]); end; return {1, count}",
    { keys: [key], arguments: [String(limit), String(secondsUntilNextHour)] },
  ) as number[];

  return { allowed: result[0] === 1, key, count: result[1], limit };
}

