import { Router } from 'express';
import { createCampaign, scheduleCampaign } from '../controllers/campaignController.js';
import { requireAuth } from '../middleware/auth.js';

export const campaignRoutes = Router();

campaignRoutes.post('/', requireAuth, createCampaign);
campaignRoutes.post('/:campaignId/schedule', requireAuth, scheduleCampaign);
