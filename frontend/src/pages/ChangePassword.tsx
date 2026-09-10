import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { apiPatch, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { roleHomePath } from '../lib/roles';

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiPatch('/auth/change-password', { newPassword });
      updateUser({ mustChangePassword: false });
      navigate(user ? roleHomePath(user.role) : '/login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/30 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 -bottom-40 h-[28rem] w-[28rem] rounded-full bg-violet-600/25 blur-[130px]" />

      <form onSubmit={handleSubmit} className="card relative w-full max-w-sm space-y-5 p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-blue-500 to-violet-500 shadow-lg shadow-indigo-950/50">
            <KeyRound size={24} className="text-white" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-white">Set your password</h1>
          <p className="mt-1 text-sm text-slate-400">
            You're using a temporary password. Set your own to continue.
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="newPassword" className="label">New password</label>
          <input
            id="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input w-full"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="confirm" className="label">Confirm password</label>
          <input
            id="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input w-full"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading ? 'Saving…' : 'Save and continue'}
        </button>
      </form>
    </div>
  );
}