import type { User } from '../types';

interface DashboardHeaderProps {
  user: User | null;
  onLogout: () => void;
}

export function DashboardHeader({ user, onLogout }: DashboardHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
          {user?.name?.charAt(0)?.toUpperCase() ?? 'R'}
        </div>
        <div>
          <div className="font-semibold text-slate-900">{user?.name ?? 'ReachInbox User'}</div>
          <div className="text-sm text-slate-500">{user?.email ?? 'No email'}</div>
        </div>
      </div>

      <button
        onClick={onLogout}
        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        Logout
      </button>
    </header>
  );
}
