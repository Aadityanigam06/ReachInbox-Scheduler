import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { getEmailById, getScheduledEmails, getSentEmails } from '../services/emailSchedulerService.js';
import { searchEmailDocuments } from '../services/elasticsearchService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export async function getScheduledEmailsHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });

  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const result = await getScheduledEmails(req.user.id, page, pageSize);
  return res.json(result);
}

export async function getSentEmailsHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });

  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const result = await getSentEmails(req.user.id, page, pageSize);
  return res.json(result);
}

export async function getEmailByIdHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });

  const emailId = String(req.params.id);
  const email = await getEmailById(emailId);
  if (!email || email.userId !== req.user.id) {
    return res.status(404).json({ message: 'Email not found' });
  }

  return res.json({ email: { ...email, bullmqJobId: email.id } });
}

export async function searchEmailsHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });

  const query = String(req.query.q ?? '').trim();
  if (!query) return res.json({ items: [] });

  const items = await searchEmailDocuments(query);
  const filtered = items.filter((item: any) => item.userId === req.user?.id);
  return res.json({ items: filtered });
}

export async function listEmailsForUser(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });

  const items = await prisma.email.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return res.json({ items });
}
