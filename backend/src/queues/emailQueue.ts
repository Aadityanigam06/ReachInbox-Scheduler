import { Queue } from 'bullmq';
import { env } from '../config/env.js';

export const emailQueue = new Queue('email-scheduler', {
  connection: {
    url: env.redisUrl,
  },
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  },
});

export default emailQueue;
