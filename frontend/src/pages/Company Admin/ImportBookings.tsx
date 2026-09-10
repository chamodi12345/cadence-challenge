import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ApiError } from '../../lib/api';

interface RejectedRow {
  row: number;
  reason: string;
}

interface ImportResult {
  totalRows: number;
  accepted: number;
  rejected: number;
  rejections: RejectedRow[];
}

type State = 'idle' | 'uploading' | 'done' | 'error';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4700';

export default function ImportBookings() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<State>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
    setResult(null);
    setError(null);
    setState('idle');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;

    setState('uploading');
    setError(null);
    setResult(null);

    try {
      const token = localStorage.getItem('cadence_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${BASE_URL}/bookings/import`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new ApiError(
          json.error?.code ?? 'UNKNOWN',
          json.error?.message ?? 'Import failed',
          json.error?.details,
        );
      }

      setResult(json.data as ImportResult);
      setState('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setState('error');
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-6 py-8 sm:px-8 lg:px-10">
        <div>
          <h2 className="page-title">Import Bookings</h2>
          <p className="page-subtitle">
            Upload a CSV of bookings. Required columns: external_ref, agent_code, booking_date
            (YYYY-MM-DD), amount, product_code.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-indigo-500 file:to-violet-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:brightness-110"
          />

          <button type="submit" disabled={!file || state === 'uploading'} className="btn-primary px-4">
            {state === 'uploading' ? 'Importing…' : 'Import'}
          </button>
        </form>

        {state === 'error' && (
          <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {state === 'done' && result && (
          <div className="card space-y-4 p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-semibold text-slate-100">{result.totalRows}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">Total rows</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-emerald-300">{result.accepted}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">Accepted</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-rose-300">{result.rejected}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">Rejected</p>
              </div>
            </div>

            {result.rejections.length === 0 ? (
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                All rows imported successfully.
              </p>
            ) : (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Rejected rows
                </p>
                <div className="max-h-80 overflow-y-auto rounded-lg border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-900/90">
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                        <th className="px-3 py-2 font-medium">Row</th>
                        <th className="px-3 py-2 font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {result.rejections.map((r) => (
                        <tr key={r.row}>
                          <td className="px-3 py-1.5 text-slate-300">{r.row}</td>
                          <td className="px-3 py-1.5 text-slate-300">{r.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}