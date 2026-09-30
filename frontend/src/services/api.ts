import axios from 'axios';
import type { RateLimitStatus } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
export const googleLoginUrl = `${API_BASE_URL.replace(/\/$/, '')}/api/auth/google`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('reachinbox-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = async (payload: { email: string; name: string; avatar?: string | null }) => {
  const response = await api.post('/api/auth/google', payload);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/api/auth/me');
  return response.data.user;
};

export const createCampaign = async (payload: { subject: string; body: string; startTime?: string; delayMs?: number; hourlyLimit?: number }) => {
  const response = await api.post('/api/campaigns', payload);
  return response.data.campaign;
};

export const scheduleCampaign = async (campaignId: string, payload: any, idempotencyKey: string) => {
  const response = await api.post(`/api/campaigns/${campaignId}/schedule`, payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return response.data;
};

export const getEmailById = async (emailId: string) => {
  const response = await api.get(`/api/emails/${encodeURIComponent(emailId)}`);
  return response.data.email;
};

export const getRateLimitStatus = async (): Promise<RateLimitStatus> => {
  const response = await api.get('/api/rate-limit/status');
  return response.data;
};

export const getScheduledEmails = async () => {
  const response = await api.get('/api/emails/scheduled');
  return response.data.items ?? response.data;
};

export const getSentEmails = async () => {
  const response = await api.get('/api/emails/sent');
  return response.data.items ?? response.data;
};

export const logout = async () => {
  await api.post('/api/auth/logout');
  localStorage.removeItem('reachinbox-token');
};

export default api;
