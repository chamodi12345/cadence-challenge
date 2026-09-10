import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className="min-h-screen flex items-center justify-center bg-blue-950">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Sign in to Cadence</h1>
          <p className="text-sm text-slate-500 mt-1">Enter your account credentials.</p>
        </div>

        {error && (
          <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">Password</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 hover:bg-blue-600"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}