import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { redis } from './config/redis.js';
import './workers/emailWorker.js';

async function start() {
  try {
    await prisma.$connect();
    console.log('Prisma connected');

    app.listen(env.port, () => {
      console.log(`Backend listening on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start backend', error);
    await redis.quit();
    await prisma.$disconnect();
    process.exit(1);
  }
}

start();
