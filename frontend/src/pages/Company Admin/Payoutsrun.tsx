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
    <div className="min-h-screen bg-blue-950">
      <div className="w-full max-w-screen-2xl mx-auto px-6 sm:px-8 lg:px-10 py-8 space-y-6">
        <div>
          <h2 className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
            Payout Runs
          </h2>
          <p className="text-sm text-blue-200 mt-1">
            Generate a monthly commission run. Draft runs can be regenerated freely; a
            finalised run is a locked financial record.
          </p>
        </div>

        <form
          onSubmit={handleGenerate}
          className="bg-white border border-blue-800 rounded-xl p-5 flex items-end gap-3"
        >
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Period</label>
            <input
              required
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={generating}
            className="rounded-md bg-blue-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 hover:bg-blue-600 transition"
          >
            {generating ? 'Generating…' : 'Generate / regenerate run'}
          </button>
        </form>
        {genError && (
          <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {genError}
          </div>
        )}

        {state === 'loading' && <p className="text-sm text-blue-200">Loading runs…</p>}
        {state === 'error' && (
          <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {state === 'ready' && runs.length === 0 && (
          <div className="text-sm text-blue-200 py-8 text-center border border-dashed border-blue-800 rounded-xl">
            No payout runs yet. Generate one above.
          </div>
        )}

        {state === 'ready' && runs.length > 0 && (
          <div className="bg-white border border-blue-800 rounded-xl overflow-hidden divide-y divide-slate-100">
            {runs.map((r) => (
              <button
                key={r.id}
                onClick={() => openRun(r.id)}
                className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50 transition"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {r.periodStart} – {r.periodEnd}
                  </p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.status === 'FINALISED' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                <p className="text-sm text-slate-700">Rs {Number(r.totalCommission).toLocaleString()}</p>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="bg-white border border-blue-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-slate-900">
                  {selected.periodStart} – {selected.periodEnd}
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    selected.status === 'FINALISED' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {selected.status}
                </span>
              </div>
              {selected.status === 'DRAFT' && (
                <button
                  onClick={() => handleFinalize(selected.id)}
                  className="rounded-md bg-emerald-600 text-white text-sm font-medium px-4 py-2 hover:bg-emerald-700 transition"
                >
                  Finalise run
                </button>
              )}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-400">
                  <th className="font-medium pb-2">Agent</th>
                  <th className="font-medium pb-2">Bookings</th>
                  <th className="font-medium pb-2">Gross volume</th>
                  <th className="font-medium pb-2">Rate(s)</th>
                  <th className="font-medium pb-2 text-right">Commission</th>
                </tr>
              </thead>
              <tbody>
                {selected.lineItems.map((li) => (
                  <tr key={li.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-1.5 text-slate-900">{li.agentCode}</td>
                    <td className="py-1.5 text-slate-500">{li.bookingCount}</td>
                    <td className="py-1.5 text-slate-500">Rs {Number(li.grossVolume).toLocaleString()}</td>
                    <td className="py-1.5 text-slate-400 text-xs">{li.ratesApplied}</td>
                    <td className="py-1.5 text-slate-900 text-right font-medium">
                      Rs {Number(li.commissionAmount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td colSpan={4} className="pt-2 text-sm font-medium text-slate-700">
                    Total
                  </td>
                  <td className="pt-2 text-sm font-semibold text-slate-900 text-right">
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