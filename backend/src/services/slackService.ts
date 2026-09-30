import { env } from '../config/env.js';

export async function sendRateLimitSlackNotification(userName: string, userEmail: string) {
  if (!env.slackWebhookUrl) {
    return { sent: false, reason: 'No Slack webhook configured' };
  }

  try {
    const response = await fetch(env.slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `Hourly email limit reached for ${userName} (${userEmail}). The scheduler paused sends until the next hour window.`,
      }),
    });

    return { sent: response.ok, status: response.status };
  } catch (error) {
    console.warn('Slack notification failed', error);
    return { sent: false, reason: 'Slack unavailable' };
  }
}
