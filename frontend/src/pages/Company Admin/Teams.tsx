import { useEffect, useState, type FormEvent } from 'react';
import { apiGet, apiPost, apiDelete, ApiError } from '../../lib/api';

interface Member {
  id: string;
  agentCode: string;
  fullName: string;
  isLead: boolean;
}

interface Team {
  id: string;
  name: string;
  members: Member[];
}

type LoadState = 'loading' | 'ready' | 'error';

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');

  async function load() {
    setState('loading');
    setError(null);
    try {
      const result = await apiGet<Team[]>('/teams');
      setTeams(result);
      setState('ready');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load teams.');
      setState('error');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreateTeam(e: FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      await apiPost('/teams', { name: newTeamName });
      setNewTeamName('');
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to create team.');
    }
  }

  async function handleDeleteTeam(id: string) {
    if (!confirm('Delete this team? This removes all its members too.')) return;
    try {
      await apiDelete(`/teams/${id}`);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to delete team.');
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-6 py-8 sm:px-8 lg:px-10">
        <div>
          <h2 className="page-title">Teams</h2>
          <p className="page-subtitle">
            A team's lead earns an extra 1% on the other members' booking volume, on top of
            their own commission.
          </p>
        </div>

        <form onSubmit={handleCreateTeam} className="card flex items-end gap-3 p-5">
          <div className="flex-1 space-y-1">
            <label className="label">New team name</label>
            <input
              required
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="e.g. Colombo Travel Team"
              className="input w-full"
            />
          </div>
          <button type="submit" className="btn-primary px-4">
            Create team
          </button>
        </form>

        {state === 'loading' && <p className="text-sm text-slate-400">Loading teams…</p>}
        {state === 'error' && (
          <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {state === 'ready' && teams.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-slate-400">
            No teams yet. Create one above.
          </div>
        )}

        {state === 'ready' && teams.length > 0 && (
          <div className="space-y-4">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} onChanged={load} onDeleteTeam={() => handleDeleteTeam(team.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamCard({ team, onChanged, onDeleteTeam }: { team: Team; onChanged: () => void; onDeleteTeam: () => void }) {
  const [agentCode, setAgentCode] = useState('');
  const [isLead, setIsLead] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddMember(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiPost(`/teams/${team.id}/members`, { agentCode, isLead });
      setAgentCode('');
      setIsLead(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add member.');
    }
  }

  async function handleRemoveMember(memberId: string) {
    try {
      await apiDelete(`/teams/${team.id}/members/${memberId}`);
      onChanged();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to remove member.');
    }
  }

  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-100">{team.name}</h3>
        <button onClick={onDeleteTeam} className="text-xs font-medium text-rose-400 transition hover:text-rose-300">
          Delete team
        </button>
      </div>

      {team.members.length === 0 ? (
        <p className="text-sm text-slate-500">No members yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-slate-400">
              <th className="pb-2 font-medium">Agent</th>
              <th className="pb-2 font-medium">Role</th>
              <th className="pb-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {team.members.map((m) => (
              <tr key={m.id} className="border-b border-white/5 last:border-0">
                <td className="py-1.5 text-slate-100">{m.fullName} ({m.agentCode})</td>
                <td className="py-1.5">
                  {m.isLead ? (
                    <span className="badge bg-indigo-500/20 text-indigo-300">
                      Lead — 1% override
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Member</span>
                  )}
                </td>
                <td className="py-1.5 text-right">
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    className="text-xs font-medium text-rose-400 transition hover:text-rose-300"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={handleAddMember} className="flex flex-wrap items-end gap-2 border-t border-white/10 pt-2">
        {error && <p className="w-full text-xs text-rose-400">{error}</p>}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Agent code</label>
          <input
            required
            value={agentCode}
            onChange={(e) => setAgentCode(e.target.value)}
            placeholder="e.g. AG-002"
            className="input w-32"
          />
        </div>
        <label className="flex items-center gap-1.5 pb-2 text-xs text-slate-400">
          <input type="checkbox" checked={isLead} onChange={(e) => setIsLead(e.target.checked)} className="accent-indigo-500" />
          Team lead
        </label>
        <button type="submit" className="btn-primary px-3 py-1.5 text-xs">
          Add member
        </button>
      </form>
    </div>
  );
}