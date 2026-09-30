import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

export async function connectSlack(_req: Request, res: Response) {
  if (!env.slackClientId || !env.slackClientSecret || !env.slackRedirectUri) {
    return res.status(400).json({ message: 'Slack OAuth is not configured. Set SLACK_WEBHOOK_URL for development mode.' });
  }

  return res.json({
    message: 'Slack OAuth configuration detected.',
    authUrl: `https://slack.com/oauth/v2/authorize?client_id=${encodeURIComponent(env.slackClientId)}&scope=incoming-webhook&redirect_uri=${encodeURIComponent(env.slackRedirectUri)}`,
  });
}

export async function disconnectSlack(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  await prisma.slackConnection.updateMany({
    where: { userId },
    data: { connected: false, webhookUrl: null, token: null },
  });

  return res.json({ ok: true });
}
