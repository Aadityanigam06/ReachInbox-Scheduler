import { Router } from 'express';
import { getEmailByIdHandler, getScheduledEmailsHandler, getSentEmailsHandler, listEmailsForUser, searchEmailsHandler } from '../controllers/emailController.js';
import { requireAuth } from '../middleware/auth.js';

export const emailRoutes = Router();

emailRoutes.get('/scheduled', requireAuth, getScheduledEmailsHandler);
emailRoutes.get('/sent', requireAuth, getSentEmailsHandler);
emailRoutes.get('/search', requireAuth, searchEmailsHandler);
emailRoutes.get('/all', requireAuth, listEmailsForUser);
emailRoutes.get('/:id', requireAuth, getEmailByIdHandler);
