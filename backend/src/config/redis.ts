import { createClient } from 'redis';
import { env } from './env.js';

export const redis = createClient({
  url: env.redisUrl,
});

redis.on('error', (err) => {
  console.error('Redis client error', err);
});

await redis.connect();
