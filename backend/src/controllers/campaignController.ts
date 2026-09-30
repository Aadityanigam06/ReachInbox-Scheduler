import type { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { IdempotencyConflictError, scheduleCampaignEmails } from '../services/emailSchedulerService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export async function createCampaign(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });

  const { subject, body, startTime, delayMs, hourlyLimit } = req.body ?? {};
  if (!subject || !body) {
    return res.status(400).json({ message: 'Subject and body are required' });
  }

  const campaign = await prisma.emailCampaign.create({
    data: {
      userId: req.user.id,
      subject,
      body,
      startTime: startTime ? new Date(startTime) : null,
      delayMs: Number(delayMs ?? 0),
      hourlyLimit: hourlyLimit ? Number(hourlyLimit) : null,
    },
  });

  return res.status(201).json({ campaign });
}

export async function scheduleCampaign(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });

  const campaignId = String(req.params.campaignId);
  const idempotencyKey = req.header('Idempotency-Key')?.trim();
  const { subject, body, startTime, delayMs, hourlyLimit, recipients } = req.body ?? {};

  if (!idempotencyKey) {
    return res.status(400).json({ message: 'Idempotency-Key header is required' });
  }
  if (!subject || !body || !recipients) {
    return res.status(400).json({ message: 'subject, body, and recipients are required' });
  }

  const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.userId !== req.user.id) {
    return res.status(404).json({ message: 'Campaign not found' });
  }

  try {
    const result = await scheduleCampaignEmails({
      userId: req.user.id,
      campaignId,
      idempotencyKey,
      subject,
      body,
      startTime: startTime ?? undefined,
      delayMs: Number(delayMs ?? 2000),
      hourlyLimit: hourlyLimit ? Number(hourlyLimit) : undefined,
      recipients,
    });

    return res.status(result.replayed ? 200 : 201).json({
      campaignId,
      scheduled: result.emails.length,
      emails: result.emails,
      replayed: result.replayed,
    });
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return res.status(409).json({ message: error.message });
    }
    throw error;
  }
}
