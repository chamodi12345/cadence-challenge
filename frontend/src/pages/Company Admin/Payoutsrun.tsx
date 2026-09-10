import { useEffect, useState, type FormEvent } from 'react';
import { apiGet, apiPost, ApiError } from '../../lib/api';

interface LineItem {
  id: string;
  agentCode: string;
  bookingCount: number;
  grossVolume: string;
  commissionAmount: string;
  ratesApplied: string;
}

interface RunSummary {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: 'DRAFT' | 'FINALISED';
  totalCommission: string;
}

interface RunDetail extends RunSummary {
  lineItems: LineItem[];
}

type LoadState = 'loading' | 'ready' | 'error';

export default function PayoutRuns() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RunDetail | null>(null);
  const [period, setPeriod] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  async function load() {
    setState('loading');
    setError(null);
    try {
      const result = await apiGet<RunSummary[]>('/payouts');
      setRuns(result);
      setState('ready');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load payout runs.');
      setState('error');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openRun(id: string) {
    try {
      const result = await apiGet<RunDetail>(`/payouts/${id}`);
      setSelected(result);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to load run details.');
    }
  }

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    setGenError(null);
    setGenerating(true);
    try {
      const result = await apiPost<RunDetail>('/payouts', { period });
      setSelected(result);
      await load();
    } catch (err) {
      setGenError(err instanceof ApiError ? err.message : 'Failed to generate payout run.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleFinalize(id: string) {
    if (!confirm('Finalise this run? It cannot be edited or regenerated after this.')) return;
    try {
      const result = await apiPost<RunDetail>(`/payouts/${id}/finalize`, {});
      setSelected(result);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to finalise run.');
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-6 py-8 sm:px-8 lg:px-10">
        <div>
          <h2 className="page-title">Payout Runs</h2>
          <p className="page-subtitle">
            Generate a monthly commission run. Draft runs can be regenerated freely; a
            finalised run is a locked financial record.
          </p>
        </div>

        <form onSubmit={handleGenerate} className="card flex items-end gap-3 p-5">
          <div className="space-y-1">
            <label className="label">Period</label>
            <input
              required
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="input"
            />
          </div>
          <button type="submit" disabled={generating} className="btn-primary px-4">
            {generating ? 'Generating…' : 'Generate / regenerate run'}
          </button>
        </form>
        {genError && (
          <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {genError}
          </div>
        )}

        {state === 'loading' && <p className="text-sm text-slate-400">Loading runs…</p>}
        {state === 'error' && (
          <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {state === 'ready' && runs.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-slate-400">
            No payout runs yet. Generate one above.
          </div>
        )}

        {state === 'ready' && runs.length > 0 && (
          <div className="card divide-y divide-white/5 overflow-hidden">
            {runs.map((r) => (
              <button
                key={r.id}
                onClick={() => openRun(r.id)}
                className="flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-white/5"
              >
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    {r.periodStart} – {r.periodEnd}
                  </p>
                  <span
                    className={`badge ${
                      r.status === 'FINALISED' ? 'bg-slate-500/20 text-slate-300' : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                <p className="text-sm text-slate-300">Rs {Number(r.totalCommission).toLocaleString()}</p>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-slate-100">
                  {selected.periodStart} – {selected.periodEnd}
                </h3>
                <span
                  className={`badge ${
                    selected.status === 'FINALISED' ? 'bg-slate-500/20 text-slate-300' : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {selected.status}
                </span>
              </div>
              {selected.status === 'DRAFT' && (
                <button
                  onClick={() => handleFinalize(selected.id)}
                  className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-950/50 transition hover:from-emerald-400 hover:to-teal-400"
                >
                  Finalise run
                </button>
              )}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-400">
                  <th className="pb-2 font-medium">Agent</th>
                  <th className="pb-2 font-medium">Bookings</th>
                  <th className="pb-2 font-medium">Gross volume</th>
                  <th className="pb-2 font-medium">Rate(s)</th>
                  <th className="pb-2 text-right font-medium">Commission</th>
                </tr>
              </thead>
              <tbody>
                {selected.lineItems.map((li) => (
                  <tr key={li.id} className="border-b border-white/5 last:border-0">
                    <td className="py-1.5 text-slate-100">{li.agentCode}</td>
                    <td className="py-1.5 text-slate-400">{li.bookingCount}</td>
                    <td className="py-1.5 text-slate-400">Rs {Number(li.grossVolume).toLocaleString()}</td>
                    <td className="py-1.5 text-xs text-slate-500">{li.ratesApplied}</td>
                    <td className="py-1.5 text-right font-medium text-slate-100">
                      Rs {Number(li.commissionAmount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10">
                  <td colSpan={4} className="pt-2 text-sm font-medium text-slate-300">
                    Total
                  </td>
                  <td className="pt-2 text-right text-sm font-semibold text-slate-100">
                    Rs {Number(selected.totalCommission).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}