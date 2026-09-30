import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { env } from '../config/env.js';
import { emailQueue } from '../queues/emailQueue.js';

export function createBullBoardRouter() {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter,
  });

  const router = express.Router();
  router.use((req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="BullMQ dashboard"');
      return res.status(401).send('Unauthorized');
    }

    const encoded = header.replace('Basic ', '');
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');

    if (username === env.bullBoardUsername && password === env.bullBoardPassword) {
      return next();
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="BullMQ dashboard"');
    return res.status(401).send('Unauthorized');
  });

  router.use('/', serverAdapter.getRouter());
  return router;
}
