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
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Cadence</h1>
        <p className="text-sm text-slate-500">
          {user.fullName} · {ROLE_LABELS[user.role]}
        </p>
      </div>
      <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-900">
        Sign out
      </button>
    </header>
  );
}