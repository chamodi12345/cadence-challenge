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
  COMPANY_ADMIN: 'bg-indigo-500/20 text-indigo-300',
  FINANCE: 'bg-amber-500/20 text-amber-300',
  AGENT: 'bg-emerald-500/20 text-emerald-300',
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
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-6 py-8 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="page-title">Users</h2>
            <p className="page-subtitle">Everyone with access to your company's account.</p>
          </div>
          <button onClick={() => setShowAddForm(true)} className="btn-primary">
            <UserPlus size={16} />
            Add user
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {users === null && !error && (
          <div className="py-8 text-center text-sm text-slate-400">Loading users…</div>
        )}

        {users !== null && users.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-slate-400">
            No users yet. Add your first Finance or Agent account.
          </div>
        )}

        {users !== null && users.length > 0 && (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="th">Name</th>
                  <th className="th">Email</th>
                  <th className="th">Role</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="border-b border-white/5 transition last:border-0 hover:bg-white/5">
                      <td className="px-5 py-3 text-slate-100">
                        {u.full_name}
                        {isSelf && <span className="ml-2 text-xs text-slate-500">(you)</span>}
                      </td>
                      <td className="px-5 py-3 text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <Mail size={14} className="text-slate-500" />
                          {u.email}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`badge ${ROLE_STYLES[u.role]}`}>
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
                                className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                                aria-label={`Edit ${u.full_name}`}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => setDeletingUser(u)}
                                className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
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
          <div className="modal-backdrop">
            <div className="card max-w-md w-full">
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
          <div className="modal-backdrop">
            <div className="card max-w-md w-full">
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
          <div className="modal-backdrop">
            <div className="card max-w-sm w-full space-y-4 p-6">
              <h2 className="text-lg font-semibold text-slate-100">Remove {deletingUser.full_name}?</h2>
              <p className="text-sm text-slate-400">
                They'll lose access to Cadence immediately. This can't be undone.
              </p>
              {deleteError && (
                <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {deleteError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="btn-danger flex-1 py-2.5"
                >
                  {deleting ? 'Removing…' : 'Remove user'}
                </button>
                <button
                  onClick={() => { setDeletingUser(null); setDeleteError(null); }}
                  className="btn-secondary px-4 py-2.5"
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