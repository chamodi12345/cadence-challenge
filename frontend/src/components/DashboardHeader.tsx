import { useAuth } from '../context/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  COMPANY_ADMIN: 'Company Admin',
  FINANCE: 'Finance Admin',
  AGENT: 'Agent',
};

// Shared header, used once by Dashboard.tsx regardless of role.
export function DashboardHeader() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-slate-950/80 via-indigo-950/60 to-slate-950/80 px-4 py-4 backdrop-blur-xl sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-white">Cadence</h1>
        <p className="text-sm text-indigo-200">
          {user.fullName} · {ROLE_LABELS[user.role]}
        </p>
      </div>
      <button onClick={logout} className="text-sm text-indigo-200 transition hover:text-white">
        Sign out
      </button>
    </header>
  );
}