import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { Response } from 'express';

export function createAuthToken(user: { id: string; email: string; name: string; avatar?: string | null }) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    },
    env.jwtSecret,
    { expiresIn: '7d' },
  );
}

export async function googleAuthHandler(req: AuthenticatedRequest, res: Response) {
  const { name, email, avatar } = req.body ?? {};

  if (!email || !name) {
    return res.status(400).json({ message: 'Email and name are required' });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, avatar: avatar ?? null },
    create: {
      name,
      email,
      avatar: avatar ?? null,
      googleId: `dev-${Date.now()}`,
    },
  });

  return res.json({ user, token: createAuthToken(user) });
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  return res.json({ user });
}

export function logoutHandler(_req: AuthenticatedRequest, res: Response) {
  return res.json({ ok: true, message: 'Logged out' });
}
