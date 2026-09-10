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

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

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
    <div className="min-h-screen bg-blue-950">
      <div className="w-full max-w-screen-2xl mx-auto px-6 sm:px-8 lg:px-10 py-8 space-y-6">
        <div>
          <h2 className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
            Import Bookings
          </h2>
          <p className="text-sm text-blue-200 mt-1">
            Upload a CSV of bookings. Required columns: external_ref, agent_code, booking_date
            (YYYY-MM-DD), amount, product_code.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-blue-800 p-6 space-y-4"
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-700 file:text-white file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-blue-600"
          />

          <button
            type="submit"
            disabled={!file || state === 'uploading'}
            className="rounded-md bg-blue-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 hover:bg-blue-600"
          >
            {state === 'uploading' ? 'Importing…' : 'Import'}
          </button>
        </form>

        {state === 'error' && (
          <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {state === 'done' && result && (
          <div className="bg-white rounded-xl border border-blue-800 p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-semibold text-slate-900">{result.totalRows}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total rows</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-emerald-600">{result.accepted}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Accepted</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-red-600">{result.rejected}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Rejected</p>
              </div>
            </div>

            {result.rejections.length === 0 ? (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                All rows imported successfully.
              </p>
            ) : (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-2">
                  Rejected rows
                </p>
                <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                        <th className="px-3 py-2 font-medium">Row</th>
                        <th className="px-3 py-2 font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.rejections.map((r) => (
                        <tr key={r.row}>
                          <td className="px-3 py-1.5 text-slate-700">{r.row}</td>
                          <td className="px-3 py-1.5 text-slate-700">{r.reason}</td>
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