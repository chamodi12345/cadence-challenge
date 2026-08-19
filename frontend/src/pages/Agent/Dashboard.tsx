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
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Agent</h2>
        <p className="text-sm text-slate-500 mt-1">Welcome back, {user.fullName}.</p>
      </div>

      <button
        onClick={() => navigate('/statement')}
        className="w-full text-left bg-white border border-slate-200 rounded-xl p-6 flex items-start gap-4 hover:bg-slate-50"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <FileText size={20} />
        </div>
        <div>
          <h3 className="font-medium text-slate-900">My statement</h3>
          <p className="text-sm text-slate-500 mt-1">
            View your bookings and commission for this period.
          </p>
        </div>
      </button>
    </div>
  );
}