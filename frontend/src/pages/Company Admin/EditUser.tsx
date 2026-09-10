// src/pages/EditUser.tsx
import { useState, type FormEvent } from 'react';
import { apiPatch, ApiError } from '../../lib/api';

interface EditUserProps {
  user: { id: string; full_name: string; role: 'FINANCE' | 'AGENT' | 'COMPANY_ADMIN' };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function EditUser({ user, onSuccess, onCancel }: EditUserProps) {
  const [fullName, setFullName] = useState(user.full_name);
  const [role, setRole] = useState<'FINANCE' | 'AGENT'>(user.role as 'FINANCE' | 'AGENT');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPatch(`/users/${user.id}`, { fullName, role });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-8">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Edit user</h1>
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

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="btn-primary flex-1 py-2.5">
          {loading ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary px-4 py-2.5">
          Cancel
        </button>
      </div>
    </form>
  );
}