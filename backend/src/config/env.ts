import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/reachinbox',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  elasticsearchUrl: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  sessionSecret: process.env.SESSION_SECRET ?? 'session-secret',
  workerConcurrency: Number(process.env.WORKER_CONCURRENCY ?? 5),
  maxEmailsPerHour: Number(process.env.MAX_EMAILS_PER_HOUR ?? 200),
  minEmailDelayMs: Number(process.env.MIN_EMAIL_DELAY_MS ?? 2000),
  etherealHost: process.env.ETHEREAL_HOST ?? 'smtp.ethereal.email',
  etherealPort: Number(process.env.ETHEREAL_PORT ?? 587),
  etherealUser: process.env.ETHEREAL_USER ?? '',
  etherealPassword: process.env.ETHEREAL_PASSWORD ?? '',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:4000/api/auth/google/callback',
  slackClientId: process.env.SLACK_CLIENT_ID ?? '',
  slackClientSecret: process.env.SLACK_CLIENT_SECRET ?? '',
  slackRedirectUri: process.env.SLACK_REDIRECT_URI ?? 'http://localhost:4000/api/slack/oauth/callback',
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL ?? '',
  bullBoardUsername: process.env.BULL_BOARD_USERNAME ?? 'admin',
  bullBoardPassword: process.env.BULL_BOARD_PASSWORD ?? 'admin',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
};
