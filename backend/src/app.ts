import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRoutes } from './routes/authRoutes.js';
import { campaignRoutes } from './routes/campaignRoutes.js';
import { emailRoutes } from './routes/emailRoutes.js';
import { slackRoutes } from './routes/slackRoutes.js';
import { rateLimitRoutes } from './routes/rateLimitRoutes.js';
import { createBullBoardRouter } from './lib/bullBoard.js';

export const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(helmet());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'reachinbox-scheduler', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/rate-limit', rateLimitRoutes);
app.use('/api/slack', slackRoutes);
app.use('/admin/queues', createBullBoardRouter());

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled app error', err);
  res.status(500).json({ message: 'Internal server error' });
});
