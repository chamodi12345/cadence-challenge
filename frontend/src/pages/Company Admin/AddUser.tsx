// src/pages/AddUser.tsx
import { useState, type FormEvent } from 'react';
import { Copy, Check } from 'lucide-react';
import { apiPost, ApiError } from '../../lib/api';

interface CreateUserResponse {
  id: string;
  email: string;
  fullName: string;
  role: 'FINANCE' | 'AGENT';
  tempPassword: string;
}

interface AddUserProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function AddUser({ onSuccess, onCancel }: AddUserProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'FINANCE' | 'AGENT'>('FINANCE');
  const [agentCode, setAgentCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreateUserResponse | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await apiPost<CreateUserResponse>('/users', {
        fullName,
        email,
        role,
        ...(role === 'AGENT' ? { agentCode } : {}),
      });
      setCreated(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!created) return;
    navigator.clipboard.writeText(created.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // --- Stage 2: show the temp password once, before closing ---
  if (created) {
    return (
      <div className="p-8 space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">User created</h1>
          <p className="text-sm text-slate-500 mt-1">
            Share this temporary password with {created.fullName}. It won't be shown again.
          </p>
        </div>

        <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Email</p>
            <p className="text-sm text-slate-900">{created.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Temporary password</p>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 text-sm font-mono bg-white border border-slate-200 rounded px-3 py-2">
                {created.tempPassword}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 rounded-md border border-slate-300 p-2 hover:bg-slate-100 transition"
                aria-label="Copy password"
              >
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-slate-500" />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSuccess}
          className="w-full rounded-md bg-slate-900 text-white text-sm font-medium py-2.5"
        >
          Done
        </button>
      </div>
    );
  }

  // --- Stage 1: the input form ---
  return (
    <form onSubmit={handleSubmit} className="p-8 space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Add a user</h1>
        <p className="text-sm text-slate-500 mt-1">Creates a new Finance or Agent login for your company.</p>
      </div>

      {error && (
        <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Full name</label>
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="FINANCE">Finance Admin</option>
          <option value="AGENT">Agent</option>
        </select>
      </div>

      {role === 'AGENT' && (
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Agent code</label>
          <input
            required
            value={agentCode}
            onChange={(e) => setAgentCode(e.target.value)}
            placeholder="e.g. AG-004"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-slate-400">Must match an existing agent record in this company.</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-md bg-slate-900 text-white text-sm font-medium py-2.5 disabled:opacity-50"
        >
          {loading ? 'Adding…' : 'Add user'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 text-slate-600 text-sm font-medium px-4 py-2.5 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}