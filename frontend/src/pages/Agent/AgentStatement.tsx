// src/pages/Agent/AgentStatement.tsx
import { useState, type FormEvent } from 'react';
import { apiGet, ApiError } from '../../lib/api';

interface Booking {
  id: string;
  externalRef: string;
  bookingDate: string;
  amount: string;
  currency: string;
  productCode: string;
}

interface PayoutInfo {
  runId: string;
  runStatus: 'DRAFT' | 'FINALISED';
  bookingCount: number;
  grossVolume: string;
  commissionAmount: string;
  ratesApplied: string;
}

interface StatementData {
  period: string;
  bookings: Booking[];
  payout: PayoutInfo | null;
}

type State = 'idle' | 'loading' | 'ready' | 'error';

export default function AgentStatement() {
  const [period, setPeriod] = useState('');
  const [state, setState] = useState<State>('idle');
  const [data, setData] = useState<StatementData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setState('loading');
    setError(null);
    try {
      const result = await apiGet<StatementData>(`/statements?period=${period}`);
      setData(result);
      setState('ready');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load your statement.');
      setState('error');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-title">My Statement</h2>
        <p className="page-subtitle">
          Your bookings and computed commission for a given month.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card flex items-end gap-3 p-5">
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
        <button type="submit" disabled={state === 'loading'} className="btn-primary px-4">
          {state === 'loading' ? 'Loading…' : 'View statement'}
        </button>
      </form>

      {state === 'error' && (
        <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {state === 'ready' && data && (
        <>
          <div className="card p-5">
            {data.payout ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Commission ({data.payout.runStatus === 'FINALISED' ? 'Finalised' : 'Draft — subject to change'})
                  </p>
                  <p className="text-2xl font-semibold text-slate-100">
                    Rs {Number(data.payout.commissionAmount).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{data.payout.ratesApplied}</p>
                </div>
                <div className="text-right text-sm text-slate-400">
                  <p>{data.payout.bookingCount} bookings</p>
                  <p>Rs {Number(data.payout.grossVolume).toLocaleString()} volume</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                No payout run has been generated for this period yet.
              </p>
            )}
          </div>

          {data.bookings.length === 0 ? (
            <div className="card rounded-lg p-8 text-center text-sm text-slate-400">
              No bookings found for this period.
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-2 font-medium">Ref</th>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Product</th>
                    <th className="px-4 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.bookings.map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-1.5 text-slate-200">{b.externalRef}</td>
                      <td className="px-4 py-1.5 text-slate-200">{b.bookingDate}</td>
                      <td className="px-4 py-1.5 text-slate-200">{b.productCode}</td>
                      <td className="px-4 py-1.5 text-right text-slate-100">
                        {b.currency} {Number(b.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}