import { createHash, randomUUID } from 'crypto';
import { prisma } from '../config/prisma.js';
import emailQueue from '../queues/emailQueue.js';
import { env } from '../config/env.js';
import { indexEmailDocument } from './elasticsearchService.js';
import { parseEmailRecipients } from '../utils/email.js';

export class IdempotencyConflictError extends Error {}

export async function scheduleCampaignEmails(input: {
  userId: string;
  campaignId: string;
  idempotencyKey: string;
  subject: string;
  body: string;
  startTime?: string | Date;
  delayMs: number;
  hourlyLimit?: number;
  recipients: string[] | string;
}) {
  const recipients = parseEmailRecipients(input.recipients);
  if (!recipients.length) {
    throw new Error('No valid email addresses provided');
  }

  const requestedStart = typeof input.startTime === 'string'
    ? new Date(input.startTime)
    : input.startTime;
  if (requestedStart && Number.isNaN(requestedStart.getTime())) {
    throw new Error('Invalid start time');
  }
  const start = requestedStart ?? new Date();
  const delayMs = Math.max(input.delayMs ?? 0, env.minEmailDelayMs);
  const requestHash = createHash('sha256').update(JSON.stringify({
    campaignId: input.campaignId,
    subject: input.subject,
    body: input.body,
    startTime: requestedStart?.toISOString() ?? null,
    delayMs,
    hourlyLimit: input.hourlyLimit ?? null,
    recipients,
  })).digest('hex');

  let emails: any[];
  let requestId: string;
  let alreadyQueued = false;
  let replayed = false;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const request = await tx.emailScheduleRequest.create({
        data: {
          userId: input.userId,
          campaignId: input.campaignId,
          idempotencyKey: input.idempotencyKey,
          requestHash,
        },
      });
      const createdEmails = [] as any[];

      for (let index = 0; index < recipients.length; index += 1) {
        const recipient = recipients[index];
        const scheduledAt = new Date(start.getTime() + index * delayMs);
        const email = await tx.email.create({
          data: {
            id: randomUUID(),
            userId: input.userId,
            campaignId: input.campaignId,
            scheduleRequestId: request.id,
            recipient,
            subject: input.subject,
            body: input.body,
            scheduledAt,
            delayMs,
            hourlyLimit: input.hourlyLimit ?? null,
            status: 'SCHEDULED',
            attempts: 0,
            idempotencyKey: `email-${randomUUID()}`,
          },
        });
        createdEmails.push(email);
      }

      return { requestId: request.id, emails: createdEmails };
    });
    requestId = created.requestId;
    emails = created.emails;
  } catch (error) {
    const existing = await prisma.emailScheduleRequest.findUnique({
      where: {
        userId_idempotencyKey: {
          userId: input.userId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      include: { emails: { orderBy: { createdAt: 'asc' } } },
    });

    if (!existing) {
      throw error;
    }
    if (existing.requestHash !== requestHash || existing.campaignId !== input.campaignId) {
      throw new IdempotencyConflictError('Idempotency-Key was already used with a different scheduling request');
    }

    requestId = existing.id;
    emails = existing.emails;
    alreadyQueued = existing.queuedAt !== null;
    replayed = true;
  }

  if (!alreadyQueued) {
    for (const email of emails) {
      const delay = Math.max(0, email.scheduledAt.getTime() - Date.now());
      await emailQueue.add(
        'send-email',
        { emailId: email.id },
        {
          jobId: email.id,
          delay,
          attempts: 5,
          backoff: { type: 'exponential', delay: 3000 },
        },
      );

      if (!replayed) {
        await indexEmailDocument(email);
      }
    }

    await prisma.emailScheduleRequest.update({
      where: { id: requestId },
      data: { queuedAt: new Date() },
    });
  }

  return { emails, replayed };
}

export async function getScheduledEmails(userId: string, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.email.findMany({
      where: { userId, status: 'SCHEDULED' },
      orderBy: { scheduledAt: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.email.count({ where: { userId, status: 'SCHEDULED' } }),
  ]);

  return { items, total, page, pageSize };
}

export async function getSentEmails(userId: string, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.email.findMany({
      where: { userId, status: 'SENT' },
      orderBy: { sentAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.email.count({ where: { userId, status: 'SENT' } }),
  ]);

  return { items, total, page, pageSize };
}

export async function getEmailById(emailId: string) {
  return prisma.email.findUnique({
    where: { id: emailId },
    include: { campaign: { select: { id: true, subject: true } } },
  });
}
