// src/pages/UsersPage.tsx
import { useEffect, useState } from 'react';
import { UserPlus, Mail, Shield, Pencil, Trash2 } from 'lucide-react';
import { apiGet, apiDelete, ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import AddUser from './AddUser';
import EditUser from './EditUser';

interface CompanyUser {
  id: string;
  email: string;
  full_name: string;
  role: 'COMPANY_ADMIN' | 'FINANCE' | 'AGENT';
  agent_id: string | null;
  created_at: string;
}

const ROLE_STYLES: Record<CompanyUser['role'], string> = {
  COMPANY_ADMIN: 'bg-indigo-50 text-indigo-700',
  FINANCE: 'bg-amber-50 text-amber-700',
  AGENT: 'bg-emerald-50 text-emerald-700',
};

const ROLE_LABELS: Record<CompanyUser['role'], string> = {
  COMPANY_ADMIN: 'Company Admin',
  FINANCE: 'Finance Admin',
  AGENT: 'Agent',
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<CompanyUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<CompanyUser | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadUsers() {
    setError(null);
    try {
      const data = await apiGet<CompanyUser[]>('/users');
      setUsers(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load users.');
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function confirmDelete() {
    if (!deletingUser) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await apiDelete(`/users/${deletingUser.id}`);
      setDeletingUser(null);
      loadUsers();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete user.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-blue-950">
      <div className="w-full max-w-screen-2xl mx-auto px-6 sm:px-8 lg:px-10 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Users</h2>
            <p className="text-sm text-blue-200 mt-1">Everyone with access to your company's account.</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 rounded-md bg-blue-700 text-white text-sm font-medium px-4 py-2 hover:bg-blue-600 transition"
          >
            <UserPlus size={16} />
            Add user
          </button>
        </div>

        {error && (
          <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {users === null && !error && (
          <div className="text-sm text-blue-200 py-8 text-center">Loading users…</div>
        )}

        {users !== null && users.length === 0 && (
          <div className="text-sm text-blue-200 py-8 text-center border border-dashed border-blue-800 rounded-xl">
            No users yet. Add your first Finance or Agent account.
          </div>
        )}

        {users !== null && users.length > 0 && (
          <div className="bg-white border border-blue-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-400">
                  <th className="font-medium px-5 py-3">Name</th>
                  <th className="font-medium px-5 py-3">Email</th>
                  <th className="font-medium px-5 py-3">Role</th>
                  <th className="font-medium px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition">
                      <td className="px-5 py-3 text-slate-900">
                        {u.full_name}
                        {isSelf && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Mail size={14} className="text-slate-300" />
                          {u.email}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[u.role]}`}>
                          <Shield size={12} />
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {u.role !== 'COMPANY_ADMIN' && (
                            <>
                              <button
                                onClick={() => setEditingUser(u)}
                                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                                aria-label={`Edit ${u.full_name}`}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => setDeletingUser(u)}
                                className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                aria-label={`Delete ${u.full_name}`}
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {showAddForm && (
          <div className="fixed inset-0 bg-blue-950/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
              <AddUser
                onSuccess={() => {
                  setShowAddForm(false);
                  loadUsers();
                }}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          </div>
        )}

        {editingUser && (
          <div className="fixed inset-0 bg-blue-950/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
              <EditUser
                user={editingUser}
                onSuccess={() => {
                  setEditingUser(null);
                  loadUsers();
                }}
                onCancel={() => setEditingUser(null)}
              />
            </div>
          </div>
        )}

        {deletingUser && (
          <div className="fixed inset-0 bg-blue-950/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Remove {deletingUser.full_name}?</h2>
              <p className="text-sm text-slate-500">
                They'll lose access to Cadence immediately. This can't be undone.
              </p>
              {deleteError && (
                <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {deleteError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 rounded-md bg-red-600 text-white text-sm font-medium py-2.5 hover:bg-red-700 disabled:opacity-50 transition"
                >
                  {deleting ? 'Removing…' : 'Remove user'}
                </button>
                <button
                  onClick={() => { setDeletingUser(null); setDeleteError(null); }}
                  className="rounded-md border border-slate-300 text-slate-600 text-sm font-medium px-4 py-2.5 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}