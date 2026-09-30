import { useEffect, useMemo, useRef, useState } from 'react';
import { DashboardHeader } from '../components/DashboardHeader';
import { createCampaign, getCurrentUser, getEmailById, getRateLimitStatus, getScheduledEmails, getSentEmails, logout, scheduleCampaign } from '../services/api';
import type { EmailDetail, RateLimitStatus, User } from '../types';

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
type PendingSchedule = { idempotencyKey: string; campaignId: string | null; fingerprint: string };

export function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [showComposer, setShowComposer] = useState(false);
  const [subject, setSubject] = useState('Weekly product update');
  const [body, setBody] = useState('Hi there,\n\nHere is the latest update from your team.');
  const [startTime, setStartTime] = useState(new Date(Date.now() + 60000).toISOString().slice(0, 16));
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [recipientsText, setRecipientsText] = useState('a@example.com, b@example.com, c@example.com');
  const [submitting, setSubmitting] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [emailDetailOpen, setEmailDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const pendingSchedule = useRef<PendingSchedule | null>(null);

  const recipientCount = useMemo(() => {
    const matches = recipientsText.match(EMAIL_REGEX) ?? [];
    return [...new Set(matches.map((email) => email.toLowerCase()))].length;
  }, [recipientsText]);

  const loadData = async () => {
    try {
      const [currentUser, scheduledItems, sentItems, rateLimitStatus] = await Promise.all([
        getCurrentUser(),
        getScheduledEmails(),
        getSentEmails(),
        getRateLimitStatus(),
      ]);
      setUser(currentUser);
      setScheduled(Array.isArray(scheduledItems) ? scheduledItems : scheduledItems.items ?? []);
      setSent(Array.isArray(sentItems) ? sentItems : sentItems.items ?? []);
      setRateLimit(rateLimitStatus);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Unable to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem('reachinbox-token');
      window.location.href = '/login';
    } catch {
      localStorage.removeItem('reachinbox-token');
      window.location.href = '/login';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setRecipientsText((current) => `${current} ${text}`.trim());
  };

  const handleSchedule = async () => {
    setSubmitting(true);
    setError('');

    try {
      const recipients = (recipientsText.match(EMAIL_REGEX) ?? []).map((value) => value.toLowerCase());
      if (!recipients.length) {
        throw new Error('No valid email addresses detected');
      }

      const uniqueRecipients = [...new Set(recipients)];
      const schedulePayload = {
        subject,
        body,
        startTime: new Date(startTime).toISOString(),
        delayMs: delayBetweenEmails,
        hourlyLimit,
        recipients: uniqueRecipients,
      };
      const fingerprint = JSON.stringify(schedulePayload);
      let pending = pendingSchedule.current;
      if (!pending || pending.fingerprint !== fingerprint) {
        pending = { idempotencyKey: crypto.randomUUID(), campaignId: null, fingerprint };
        pendingSchedule.current = pending;
      }

      if (!pending.campaignId) {
        const campaign = await createCampaign({
          subject,
          body,
          startTime: schedulePayload.startTime,
          delayMs: delayBetweenEmails,
          hourlyLimit,
        });
        pending.campaignId = campaign.id;
      }

      const campaignId = pending.campaignId;
      if (!campaignId) throw new Error('Unable to create campaign');
      await scheduleCampaign(campaignId, schedulePayload, pending.idempotencyKey);

      pendingSchedule.current = null;
      setShowComposer(false);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Scheduling failed');
    } finally {
      setSubmitting(false);
    }
  };

  const openEmailDetail = async (emailId: string) => {
    setSelectedEmail(null);
    setDetailError('');
    setDetailLoading(true);
    setEmailDetailOpen(true);
    try {
      setSelectedEmail(await getEmailById(emailId));
    } catch (err: any) {
      setDetailError(err?.response?.data?.message ?? 'Unable to load email details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEmailRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, emailId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void openEmailDetail(emailId);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <DashboardHeader user={user} onLogout={handleLogout} />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-slate-500">Monitor and schedule outbound email campaigns</p>
          </div>
          <button onClick={() => { pendingSchedule.current = null; setShowComposer(true); }} aria-label="Compose New Email" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-600 p-0 text-3xl font-medium leading-none text-white shadow hover:bg-sky-700 sm:h-auto sm:w-auto sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-base">
            <span className="sm:hidden" aria-hidden="true">+</span>
            <span className="hidden sm:inline">Compose New Email</span>
          </button>
        </div>

        {error ? <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {rateLimit ? (
          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4" aria-label="Hourly sending limit">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Hourly sending limit</h2>
              <span className="text-sm text-slate-600">{rateLimit.used} / {rateLimit.limit} emails used</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={rateLimit.limit} aria-valuenow={Math.min(rateLimit.used, rateLimit.limit)} aria-label="Hourly email usage">
              <div className="h-full rounded-full bg-sky-600" style={{ width: `${rateLimit.limit > 0 ? Math.min(100, (rateLimit.used / rateLimit.limit) * 100) : 0}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-slate-600">
              <span>Remaining: {rateLimit.remaining}</span>
              <span>Next available: {rateLimit.nextAvailableAt ? new Date(rateLimit.nextAvailableAt).toLocaleString() : '—'}</span>
            </div>
            {rateLimit.remaining === 0 ? <p className="mt-2 text-sm font-medium text-amber-800">The hourly limit is reached. Additional emails are queued for the next available window.</p> : null}
          </section>
        ) : null}

        <div className="mb-6 flex gap-3 rounded-xl border border-slate-200 bg-white p-2">
          <button onClick={() => setTab('scheduled')} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'scheduled' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>
            Scheduled Emails
          </button>
          <button onClick={() => setTab('sent')} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'sent' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>
            Sent Emails
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {tab === 'scheduled' ? (
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">Email</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">Subject</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">Scheduled time</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {scheduled.length ? scheduled.map((email) => (
                  <tr key={email.id} onClick={() => void openEmailDetail(email.id)} onKeyDown={(event) => handleEmailRowKeyDown(event, email.id)} tabIndex={0} aria-label={`View details for ${email.recipient}`} className="cursor-pointer hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600">
                    <td className="px-4 py-3 text-sm text-slate-700">{email.recipient}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{email.subject}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{new Date(email.scheduledAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm"><span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">{email.status}</span></td>
                  </tr>
                )) : <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">No scheduled emails yet.</td></tr>}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">Email</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">Subject</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">Sent time</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sent.length ? sent.map((email) => (
                  <tr key={email.id} onClick={() => void openEmailDetail(email.id)} onKeyDown={(event) => handleEmailRowKeyDown(event, email.id)} tabIndex={0} aria-label={`View details for ${email.recipient}`} className="cursor-pointer hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600">
                    <td className="px-4 py-3 text-sm text-slate-700">{email.recipient}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{email.subject}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{email.sentAt ? new Date(email.sentAt).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-sm"><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">{email.status}</span></td>
                  </tr>
                )) : <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">No sent emails yet.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {showComposer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Compose campaign</h2>
              <button onClick={() => setShowComposer(false)} className="text-slate-500">Close</button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Body</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Start time</label>
                <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Delay between emails</label>
                <input type="number" min={0} value={delayBetweenEmails} onChange={(e) => setDelayBetweenEmails(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Hourly limit</label>
                <input type="number" min={1} value={hourlyLimit} onChange={(e) => setHourlyLimit(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
              </div>

              <div className="md:col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Recipients</label>
                  <span className="text-xs text-slate-500">{recipientCount} email addresses detected</span>
                </div>
                <textarea value={recipientsText} onChange={(e) => setRecipientsText(e.target.value)} rows={6} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
                <div className="mt-2 flex items-center gap-3">
                  <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    Upload CSV or text
                    <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <button onClick={() => setRecipientsText((current) => current.replace(/\s*[,;\n]+\s*/g, '\n'))} className="text-sm text-sky-700">Normalize</button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { pendingSchedule.current = null; setShowComposer(false); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
              <button onClick={handleSchedule} disabled={submitting} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60">
                {submitting ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {emailDetailOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setEmailDetailOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="email-detail-title" className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 id="email-detail-title" className="text-lg font-semibold">Email details</h2>
              <button onClick={() => setEmailDetailOpen(false)} className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">Close</button>
            </div>
            {detailLoading ? <p className="py-8 text-center text-slate-500">Loading email details...</p> : null}
            {detailError ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{detailError}</p> : null}
            {selectedEmail ? (
              <>
                {selectedEmail.status === 'SCHEDULED' ? <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-900">This email has not been sent yet.</p> : null}
                <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-3 text-sm">
                  <dt className="font-medium text-slate-500">Recipient</dt><dd className="break-all text-slate-900">{selectedEmail.recipient}</dd>
                  <dt className="font-medium text-slate-500">Subject</dt><dd className="break-words text-slate-900">{selectedEmail.subject}</dd>
                  <dt className="font-medium text-slate-500">Status</dt><dd className="text-slate-900">{selectedEmail.status}</dd>
                  <dt className="font-medium text-slate-500">Scheduled time</dt><dd className="text-slate-900">{new Date(selectedEmail.scheduledAt).toLocaleString()}</dd>
                  {selectedEmail.sentAt ? <><dt className="font-medium text-slate-500">Sent time</dt><dd className="text-slate-900">{new Date(selectedEmail.sentAt).toLocaleString()}</dd></> : null}
                  <dt className="font-medium text-slate-500">Created time</dt><dd className="text-slate-900">{new Date(selectedEmail.createdAt).toLocaleString()}</dd>
                  <dt className="font-medium text-slate-500">Attempts</dt><dd className="text-slate-900">{selectedEmail.attempts}</dd>
                  {selectedEmail.error ? <><dt className="font-medium text-slate-500">Error</dt><dd className="break-words text-red-700">{selectedEmail.error}</dd></> : null}
                  <dt className="font-medium text-slate-500">Campaign</dt><dd className="break-words text-slate-900">{selectedEmail.campaign?.subject ?? selectedEmail.campaignId ?? '—'}</dd>
                  <dt className="font-medium text-slate-500">BullMQ job ID</dt><dd className="break-all text-slate-900">{selectedEmail.bullmqJobId ?? '—'}</dd>
                </dl>
                {selectedEmail.status === 'SENT' && selectedEmail.previewUrl ? <a href={selectedEmail.previewUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800">View Email Preview</a> : null}
              </>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
