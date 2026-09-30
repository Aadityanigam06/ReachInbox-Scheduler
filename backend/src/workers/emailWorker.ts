import { DelayedError, Worker } from 'bullmq';
import { prisma } from '../config/prisma.js';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';
import { reserveEmailSlot } from '../services/rateLimitService.js';
import { sendEmailWithTransport } from '../services/smtpService.js';
import { indexEmailDocument } from '../services/elasticsearchService.js';
import { sendRateLimitSlackNotification } from '../services/slackService.js';

const worker = new Worker(
  'email-scheduler',
  async (job) => {
    const { emailId } = job.data as { emailId: string };
    if (!emailId) return;

    const email = await prisma.email.findUnique({ where: { id: emailId } });
    if (!email) return;
    if (email.status === 'SENT') return;
    if (email.status === 'FAILED') return;

    const acquisition = await prisma.$transaction(async (tx) => {
      const current = await tx.email.findUnique({ where: { id: emailId } });
      if (!current) return { allowed: false };
      if (current.status === 'SENT' || current.status === 'PROCESSING') {
        return { allowed: false };
      }

      await tx.email.update({
        where: { id: emailId },
        data: { status: 'PROCESSING', attempts: { increment: 1 }, error: null },
      });

      return { allowed: true };
    });

    if (!acquisition.allowed) return;

    const user = await prisma.user.findUnique({ where: { id: email.userId } });
    const rateLimit = await reserveEmailSlot(email.userId, new Date());

    if (!rateLimit.allowed) {
      const notifyKey = `rate-limit-notify:${email.userId}:${rateLimit.key}`;
      const notified = await redis.set(notifyKey, '1', { EX: 3600, NX: true });
      if (notified === 'OK' && user) {
        await sendRateLimitSlackNotification(user.name, user.email);
      }

      const nextHour = new Date();
      nextHour.setUTCMinutes(0, 0, 0);
      nextHour.setUTCHours(nextHour.getUTCHours() + 1);
      await prisma.email.update({
        where: { id: email.id },
        data: { status: 'SCHEDULED', error: `Rate limit reached; retry at ${nextHour.toISOString()}` },
      });
      await indexEmailDocument({ ...email, status: 'SCHEDULED', error: `Rate limit reached; retry at ${nextHour.toISOString()}` });
      await job.moveToDelayed(nextHour.getTime(), job.token);
      throw new DelayedError();
    }

    try {
      const result = await sendEmailWithTransport({
        to: email.recipient,
        subject: email.subject,
        body: email.body,
      });
      console.log('Email successfully accepted by SMTP', {
        emailId: email.id,
        smtpResponse: result.response,
        messageId: result.messageId,
        previewUrl: result.previewUrl,
      });

      await prisma.email.update({
        where: { id: email.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          messageId: result.messageId,
          previewUrl: result.previewUrl ?? null,
          error: null,
        },
      });

      await indexEmailDocument({
        ...email,
        status: 'SENT',
        messageId: result.messageId,
        sentAt: new Date().toISOString(),
        previewUrl: result.previewUrl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SMTP send failed';
      await prisma.email.update({
        where: { id: email.id },
        data: {
          status: 'FAILED',
          error: message,
          attempts: { increment: 1 },
        },
      });
      await indexEmailDocument({ ...email, status: 'FAILED', error: message });
      throw error;
    }
  },
  {
    connection: {
      url: env.redisUrl,
    },
    concurrency: env.workerConcurrency,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, error) => {
  console.error(`Job ${job?.id ?? 'unknown'} failed`, error);
});

export default worker;
