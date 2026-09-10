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
      <div className="space-y-5 p-8">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">User created</h1>
          <p className="mt-1 text-sm text-slate-400">
            Share this temporary password with {created.fullName}. It won't be shown again.
          </p>
        </div>

        <div className="space-y-3 rounded-lg border border-indigo-400/30 bg-indigo-500/10 p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</p>
            <p className="text-sm text-slate-100">{created.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Temporary password</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 rounded border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-emerald-300">
                {created.tempPassword}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="btn-secondary shrink-0 p-2"
                aria-label="Copy password"
              >
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-indigo-300" />}
              </button>
            </div>
          </div>
        </div>

        <button type="button" onClick={onSuccess} className="btn-primary w-full py-2.5">
          Done
        </button>
      </div>
    );
  }

  // --- Stage 1: the input form ---
  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-8">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Add a user</h1>
        <p className="mt-1 text-sm text-slate-400">Creates a new Finance or Agent login for your company.</p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label className="label">Full name</label>
        <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="input w-full" />
      </div>

      <div className="space-y-1">
        <label className="label">Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input w-full" />
      </div>

      <div className="space-y-1">
        <label className="label">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          className="input w-full [&>option]:bg-slate-900 [&>option]:text-white"
        >
          <option value="FINANCE">Finance Admin</option>
          <option value="AGENT">Agent</option>
        </select>
      </div>

      {role === 'AGENT' && (
        <div className="space-y-1">
          <label className="label">Agent code</label>
          <input
            required
            value={agentCode}
            onChange={(e) => setAgentCode(e.target.value)}
            placeholder="e.g. AG-004"
            className="input w-full"
          />
          <p className="text-xs text-slate-500">Must match an existing agent record in this company.</p>
        </div>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="btn-primary flex-1 py-2.5">
          {loading ? 'Adding…' : 'Add user'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary px-4 py-2.5">
          Cancel
        </button>
      </div>
    </form>
  );
}