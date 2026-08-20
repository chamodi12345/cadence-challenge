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
    <div className="min-h-screen bg-blue-950">
      <div className="w-full max-w-screen-2xl mx-auto px-6 sm:px-8 lg:px-10 py-8 space-y-6">
        <div>
          <h2 className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Teams</h2>
          <p className="text-sm text-blue-200 mt-1">
            A team's lead earns an extra 1% on the other members' booking volume, on top of
            their own commission.
          </p>
        </div>

        <form onSubmit={handleCreateTeam} className="bg-white border border-blue-800 rounded-xl p-5 flex items-end gap-3">
          <div className="space-y-1 flex-1">
            <label className="text-sm font-medium text-slate-700">New team name</label>
            <input
              required
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="e.g. Colombo Travel Team"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-blue-700 text-white text-sm font-medium px-4 py-2 hover:bg-blue-600"
          >
            Create team
          </button>
        </form>

        {state === 'loading' && <p className="text-sm text-blue-200">Loading teams…</p>}
        {state === 'error' && (
          <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {state === 'ready' && teams.length === 0 && (
          <div className="text-sm text-blue-200 py-8 text-center border border-dashed border-blue-800 rounded-xl">
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
    <div className="bg-white border border-blue-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-900">{team.name}</h3>
        <button onClick={onDeleteTeam} className="text-xs text-red-600 hover:text-red-700 font-medium">
          Delete team
        </button>
      </div>

      {team.members.length === 0 ? (
        <p className="text-sm text-slate-400">No members yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-slate-400">
              <th className="font-medium pb-2">Agent</th>
              <th className="font-medium pb-2">Role</th>
              <th className="font-medium pb-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {team.members.map((m) => (
              <tr key={m.id} className="border-b border-slate-50 last:border-0">
                <td className="py-1.5 text-slate-900">{m.fullName} ({m.agentCode})</td>
                <td className="py-1.5">
                  {m.isLead ? (
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                      Lead — 1% override
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Member</span>
                  )}
                </td>
                <td className="py-1.5 text-right">
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={handleAddMember} className="flex items-end gap-2 pt-2 border-t border-slate-100">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Agent code</label>
          <input
            required
            value={agentCode}
            onChange={(e) => setAgentCode(e.target.value)}
            placeholder="e.g. AG-002"
            className="w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 pb-2">
          <input type="checkbox" checked={isLead} onChange={(e) => setIsLead(e.target.checked)} />
          Team lead
        </label>
        <button
          type="submit"
          className="rounded-md bg-blue-700 text-white text-xs font-medium px-3 py-1.5 hover:bg-blue-600"
        >
          Add member
        </button>
      </form>
    </div>
  );
}