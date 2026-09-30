import { Router } from 'express';
import type { Response } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { getRateLimitStatus } from '../services/rateLimitService.js';

export const rateLimitRoutes = Router();

rateLimitRoutes.get('/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  return res.json(await getRateLimitStatus(req.user.id));
});