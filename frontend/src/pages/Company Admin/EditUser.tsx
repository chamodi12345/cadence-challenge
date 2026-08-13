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
    <form onSubmit={handleSubmit} className="p-8 space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Edit user</h1>
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

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-md bg-slate-900 text-white text-sm font-medium py-2.5 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save changes'}
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