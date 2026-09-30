export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

export interface EmailItem {
  id: string;
  recipient: string;
  subject: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt?: string | null;
  body?: string;
}

export interface EmailDetail extends EmailItem {
  createdAt: string;
  attempts: number;
  error?: string | null;
  previewUrl?: string | null;
  campaignId?: string | null;
  campaign?: { id: string; subject: string } | null;
  bullmqJobId?: string | null;
}

export interface RateLimitStatus {
  limit: number;
  used: number;
  remaining: number;
  windowStart: string;
  windowEnd: string;
  nextAvailableAt: string | null;
}
