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
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          My Statement
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Your bookings and computed commission for a given month.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 flex items-end gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Period</label>
          <input
            required
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={state === 'loading'}
          className="rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 hover:bg-slate-800"
        >
          {state === 'loading' ? 'Loading…' : 'View statement'}
        </button>
      </form>

      {state === 'error' && (
        <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {state === 'ready' && data && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            {data.payout ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">
                    Commission ({data.payout.runStatus === 'FINALISED' ? 'Finalised' : 'Draft — subject to change'})
                  </p>
                  <p className="text-2xl font-semibold text-slate-900">
                    Rs {Number(data.payout.commissionAmount).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{data.payout.ratesApplied}</p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>{data.payout.bookingCount} bookings</p>
                  <p>Rs {Number(data.payout.grossVolume).toLocaleString()} volume</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No payout run has been generated for this period yet.
              </p>
            )}
          </div>

          {data.bookings.length === 0 ? (
            <div className="text-sm text-slate-500 bg-white border border-slate-200 rounded-lg p-8 text-center">
              No bookings found for this period.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-2 font-medium">Ref</th>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Product</th>
                    <th className="px-4 py-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.bookings.map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-1.5 text-slate-700">{b.externalRef}</td>
                      <td className="px-4 py-1.5 text-slate-700">{b.bookingDate}</td>
                      <td className="px-4 py-1.5 text-slate-700">{b.productCode}</td>
                      <td className="px-4 py-1.5 text-slate-900 text-right">
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