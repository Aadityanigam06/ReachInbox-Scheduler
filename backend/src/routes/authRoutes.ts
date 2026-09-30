import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { createAuthToken, getCurrentUser, googleAuthHandler, logoutHandler } from '../controllers/authController.js';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const authRoutes = Router();

const googleOAuthConfigured = Boolean(env.googleClientId && env.googleClientSecret);

if (googleOAuthConfigured) {
	passport.use(
		'google',
		new GoogleStrategy(
			{
				clientID: env.googleClientId,
				clientSecret: env.googleClientSecret,
				callbackURL: env.googleCallbackUrl,
			},
			async (_accessToken, _refreshToken, profile, done) => {
				try {
					const email = profile.emails?.[0]?.value;
					if (!email) {
						return done(null, false, { message: 'Google account did not provide an email address' });
					}

					const user = await prisma.user.upsert({
						where: { email },
						update: {
							googleId: profile.id,
							name: profile.displayName || email,
							avatar: profile.photos?.[0]?.value ?? null,
						},
						create: {
							googleId: profile.id,
							email,
							name: profile.displayName || email,
							avatar: profile.photos?.[0]?.value ?? null,
						},
					});

					return done(null, user);
				} catch (error) {
					return done(error as Error);
				}
			},
		),
	);
}

authRoutes.use(passport.initialize());

authRoutes.get('/google', (req, res, next) => {
	if (!googleOAuthConfigured) {
		return res.status(503).json({ message: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' });
	}

	return passport.authenticate('google', {
		scope: ['profile', 'email'],
		session: false,
	})(req, res, next);
});

authRoutes.get('/google/callback', (req, res, next) => {
	if (!googleOAuthConfigured) {
		return res.status(503).json({ message: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' });
	}

	if (typeof req.query.code !== 'string' || req.query.error) {
		return res.redirect(`${env.frontendUrl}/login?error=google_auth_failed`);
	}

	return passport.authenticate('google', { session: false }, (error: Error | null, user: Express.User | false) => {
		if (error || !user) {
			return res.redirect(`${env.frontendUrl}/login?error=google_auth_failed`);
		}

		const authenticatedUser = user as { id: string; email: string; name: string; avatar: string | null };
		const token = createAuthToken(authenticatedUser);
		return res.redirect(`${env.frontendUrl}/dashboard#token=${encodeURIComponent(token)}`);
	})(req, res, next);
});

authRoutes.post('/google', googleAuthHandler);
authRoutes.get('/me', requireAuth, getCurrentUser);
authRoutes.post('/logout', requireAuth, logoutHandler);
