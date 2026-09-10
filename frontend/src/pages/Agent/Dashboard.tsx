// src/pages/Agent/Dashboard.tsx
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AgentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-title">Agent</h2>
        <p className="page-subtitle">Welcome back, {user.fullName}.</p>
      </div>

      <button
        onClick={() => navigate('/statement')}
        className="card card-hover group flex w-full items-start gap-4 p-6 text-left"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-black/30">
          <FileText size={20} />
        </div>
        <div>
          <h3 className="font-medium text-slate-100">My statement</h3>
          <p className="mt-1 text-sm text-slate-400">
            View your bookings and commission for this period.
          </p>
        </div>
      </button>
    </div>
  );
}