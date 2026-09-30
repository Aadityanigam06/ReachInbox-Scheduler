export type UserRole = 'USER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

export interface EmailRecord {
  id: string;
  userId: string;
  campaignId: string | null;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';
  attempts: number;
  sentAt: string | null;
  emailAddress?: string;
}
