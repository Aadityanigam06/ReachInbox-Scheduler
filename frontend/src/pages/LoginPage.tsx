import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { googleLoginUrl, login } from '../services/api';

export function LoginPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('Demo User');
  const [email, setEmail] = useState('demo@reachinbox.local');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login({ name, email, avatar: null });
      localStorage.setItem('reachinbox-token', result.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="mb-3 text-2xl font-bold text-slate-900">ReachInbox Scheduler</div>
          <p className="text-sm text-slate-500">Sign in to your account</p>
        </div>

        <a href={googleLoginUrl} className="mb-5 block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-center font-medium text-slate-700 transition hover:bg-slate-50">
          Continue with Google
        </a>

        <p className="mb-4 text-center text-xs text-slate-500">Or use development login</p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-sky-500" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-sky-500" />
          </div>

          {error ? <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

          <button disabled={loading} className="w-full rounded-xl bg-sky-600 px-4 py-2.5 font-medium text-white transition hover:bg-sky-700 disabled:opacity-60">
            {loading ? 'Signing in...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
