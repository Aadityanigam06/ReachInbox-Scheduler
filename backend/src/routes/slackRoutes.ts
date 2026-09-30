import { Router } from 'express';
import { connectSlack, disconnectSlack } from '../controllers/slackController.js';
import { requireAuth } from '../middleware/auth.js';

export const slackRoutes = Router();

slackRoutes.post('/connect', requireAuth, connectSlack);
slackRoutes.post('/disconnect', requireAuth, disconnectSlack);
