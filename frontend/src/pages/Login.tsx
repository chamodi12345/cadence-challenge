import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock } from 'lucide-react';
import { apiPost, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { roleHomePath } from '../lib/roles';

interface LoginResponse {
  token: string;
  user: { id: string; email: string; fullName: string; role: 'COMPANY_ADMIN' | 'FINANCE' | 'AGENT'; companyId: string; mustChangePassword: boolean; };
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await apiPost<LoginResponse>('/auth/login', { email, password });
      login(result.token, result.user);
      navigate(result.user.mustChangePassword ? '/change-password' : roleHomePath(result.user.role));
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
      <div className="pointer-events-none absolute left-2/3 top-1/3 h-72 w-72 rounded-full bg-sky-500/20 blur-[100px]" />

      <form
        onSubmit={handleSubmit}
        className="card relative w-full max-w-sm space-y-5 p-8"
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-blue-500 to-violet-500 shadow-lg shadow-indigo-950/50">
            <Activity size={24} className="text-white" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-white">Sign in to Cadence</h1>
          <p className="mt-1 text-sm text-slate-400">Enter your account credentials.</p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="label">Email</label>
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full pl-9"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="label">Password</label>
          <div className="relative">
            <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full pl-9"
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}