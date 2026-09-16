import { useEffect, useState, type FormEvent } from 'react';
import { apiGet, apiPost, ApiError } from '../../lib/api';

interface Refund {
  id: string;
  bookingId: string;
  amount: string;
  refundDate: string;
  reason: string | null;
  settledRunId: string | null;
  createdAt: string;
  status: 'PENDING_SETTLEMENT' | 'SETTLED';
}

type LoadState = 'loading' | 'ready' | 'error';

export default function Refunds() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);

  const [bookingId, setBookingId] = useState('');
  const [amount, setAmount] = useState('');
  const [refundDate, setRefundDate] = useState('');
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function load() {
    setState('loading');
    setError(null);
    try {
      const result = await apiGet<Refund[]>('/refunds');
      setRefunds(result);
      setState('ready');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load refunds.');
      setState('error');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      await apiPost<Refund>('/refunds', {
        bookingId,
        amount,
        refundDate,
        reason: reason || undefined,
      });
      setBookingId('');
      setAmount('');
      setRefundDate('');
      setReason('');
      await load();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Failed to record refund.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-6 py-8 sm:px-8 lg:px-10">
        <div>
          <h2 className="page-title">Refunds</h2>
          <p className="page-subtitle">
            Record a refund against a booking. If the booking was already paid out in a
            finalised run, its commission is clawed back from the next payout run.
          </p>
        </div>

        <form onSubmit={handleCreate} className="card space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="space-y-1 sm:col-span-1">
              <label className="label">Booking id</label>
              <input
                required
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                placeholder="e.g. bkg_nw_0001"
                className="input"
              />
            </div>
            <div className="space-y-1">
              <label className="label">Amount (Rs)</label>
              <input
                required
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="input"
              />
            </div>
            <div className="space-y-1">
              <label className="label">Refund date</label>
              <input
                required
                type="date"
                value={refundDate}
                onChange={(e) => setRefundDate(e.target.value)}
                className="input"
              />
            </div>
            <div className="space-y-1">
              <label className="label">Reason</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional"
                className="input"
              />
            </div>
          </div>
          <button type="submit" disabled={creating} className="btn-primary px-4">
            {creating ? 'Recording…' : 'Record refund'}
          </button>
        </form>
        {createError && (
          <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {createError}
          </div>
        )}

        {state === 'loading' && <p className="text-sm text-slate-400">Loading refunds…</p>}
        {state === 'error' && (
          <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {state === 'ready' && refunds.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-slate-400">
            No refunds yet. Record one above.
          </div>
        )}

        {state === 'ready' && refunds.length > 0 && (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-400">
                  <th className="px-5 py-3 font-medium">Booking</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Refund date</th>
                  <th className="px-5 py-3 font-medium">Reason</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {refunds.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-3 font-mono text-xs text-slate-100">{r.bookingId}</td>
                    <td className="px-5 py-3 text-slate-100">Rs {Number(r.amount).toLocaleString()}</td>
                    <td className="px-5 py-3 text-slate-400">{r.refundDate}</td>
                    <td className="px-5 py-3 text-slate-400">{r.reason ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`badge ${
                          r.status === 'SETTLED'
                            ? 'bg-slate-500/20 text-slate-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {r.status === 'SETTLED' ? 'Clawed back' : 'Pending settlement'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}