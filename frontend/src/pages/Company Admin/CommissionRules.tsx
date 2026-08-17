import { useEffect, useState, type FormEvent } from 'react';
import { apiGet, apiPost, apiDelete, ApiError } from '../../lib/api';

interface Tier {
  id?: string;
  minVolume: string;
  maxVolume: string | null;
  rate: number;
}

interface ProductOverride {
  id?: string;
  productCode: string;
  rate: number;
}

interface RuleSet {
  id: string;
  label: string;
  effectiveFrom: string;
  tiers: Tier[];
  productOverrides: ProductOverride[];
}

type LoadState = 'loading' | 'ready' | 'error';

function isLocked(effectiveFrom: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return effectiveFrom <= today;
}

export default function CommissionRules() {
  const [ruleSets, setRuleSets] = useState<RuleSet[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setState('loading');
    setError(null);
    try {
      const result = await apiGet<RuleSet[]>('/rules');
      setRuleSets(result);
      setState('ready');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load commission rules.');
      setState('error');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Delete this rule set? This cannot be undone.')) return;
    try {
      await apiDelete(`/rules/${id}`);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to delete rule set.');
    }
  }

  return (
    <div className="min-h-screen bg-blue-950">
      <div className="w-full max-w-screen-2xl mx-auto px-6 sm:px-8 lg:px-10 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
              Commission Rules
            </h2>
            <p className="text-sm text-blue-200 mt-1">
              Volume-tiered rates, effective-dated. Once a rule set's effective date has
              arrived, it locks — changing rates means creating a new rule set instead.
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-blue-700 text-white text-sm font-medium px-4 py-2 hover:bg-blue-600 transition"
          >
            {showForm ? 'Cancel' : 'New rule set'}
          </button>
        </div>

        {showForm && (
          <RuleSetForm
            onCreated={() => {
              setShowForm(false);
              load();
            }}
          />
        )}

        {state === 'loading' && (
          <p className="text-sm text-blue-200">Loading rule sets…</p>
        )}

        {state === 'error' && (
          <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {state === 'ready' && ruleSets.length === 0 && (
          <div className="text-sm text-blue-200 py-8 text-center border border-dashed border-blue-800 rounded-xl">
            No commission rules yet. Create one to define how agents earn.
          </div>
        )}

        {state === 'ready' && ruleSets.length > 0 && (
          <div className="space-y-4">
            {ruleSets.map((rs) => (
              <RuleSetCard key={rs.id} ruleSet={rs} onDelete={() => handleDelete(rs.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RuleSetCard({ ruleSet, onDelete }: { ruleSet: RuleSet; onDelete: () => void }) {
  const locked = isLocked(ruleSet.effectiveFrom);

  return (
    <div className="bg-white border border-blue-800 rounded-xl overflow-hidden p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-slate-900">{ruleSet.label}</h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                locked ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 text-indigo-700'
              }`}
            >
              {locked ? 'Locked' : 'Upcoming'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Effective from {ruleSet.effectiveFrom}</p>
        </div>
        {!locked && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition text-xs font-medium"
            aria-label={`Delete ${ruleSet.label}`}
          >
            Delete
          </button>
        )}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-slate-400">
            <th className="font-medium pb-2">Volume range</th>
            <th className="font-medium pb-2">Rate</th>
          </tr>
        </thead>
        <tbody>
          {ruleSet.tiers.map((tier, i) => (
            <tr key={tier.id ?? i} className="border-b border-slate-50 last:border-0">
              <td className="py-1.5 text-slate-900">
                {Number(tier.minVolume).toLocaleString()} –{' '}
                {tier.maxVolume ? Number(tier.maxVolume).toLocaleString() : 'and above'}
              </td>
              <td className="py-1.5 text-slate-500">{(tier.rate * 100).toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      {ruleSet.productOverrides.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1.5">
            Product overrides
          </p>
          <div className="flex flex-wrap gap-2">
            {ruleSet.productOverrides.map((o, i) => (
              <span
                key={o.id ?? i}
                className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-md font-medium"
              >
                {o.productCode}: {(o.rate * 100).toFixed(2)}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RuleSetForm({ onCreated }: { onCreated: () => void }) {
  const [label, setLabel] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [tiers, setTiers] = useState<Tier[]>([{ minVolume: '0', maxVolume: null, rate: 0.03 }]);
  const [overrides, setOverrides] = useState<ProductOverride[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function addTier() {
    setTiers((t) => [...t, { minVolume: '', maxVolume: null, rate: 0 }]);
  }

  function updateTier(i: number, patch: Partial<Tier>) {
    setTiers((t) => t.map((tier, idx) => (idx === i ? { ...tier, ...patch } : tier)));
  }

  function removeTier(i: number) {
    setTiers((t) => t.filter((_, idx) => idx !== i));
  }

  function addOverride() {
    setOverrides((o) => [...o, { productCode: '', rate: 0 }]);
  }

  function updateOverride(i: number, patch: Partial<ProductOverride>) {
    setOverrides((o) => o.map((ov, idx) => (idx === i ? { ...ov, ...patch } : ov)));
  }

  function removeOverride(i: number) {
    setOverrides((o) => o.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost('/rules', {
        label,
        effectiveFrom,
        tiers: tiers.map((t) => ({
          minVolume: t.minVolume,
          maxVolume: t.maxVolume || null,
          rate: t.rate,
        })),
        productOverrides: overrides,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create rule set.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-blue-800 rounded-xl p-5 space-y-5"
    >
      {error && (
        <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Label</label>
          <input
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Standard rates — 2026"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Effective from</label>
          <input
            required
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-slate-400">
            Once this date arrives, this rule set locks and can no longer be edited or deleted.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">Volume tiers</label>
          <button type="button" onClick={addTier} className="text-xs text-blue-700 hover:text-blue-800 font-medium">
            + Add tier
          </button>
        </div>
        {tiers.map((tier, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              required
              placeholder="Min volume"
              value={tier.minVolume}
              onChange={(e) => updateTier(i, { minVolume: e.target.value })}
              className="w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-slate-400 text-sm">–</span>
            <input
              placeholder="Max (blank = open-ended)"
              value={tier.maxVolume ?? ''}
              onChange={(e) => updateTier(i, { maxVolume: e.target.value || null })}
              className="w-40 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              required
              type="number"
              step="0.0001"
              min="0"
              max="1"
              placeholder="Rate (0.05 = 5%)"
              value={tier.rate}
              onChange={(e) => updateTier(i, { rate: Number(e.target.value) })}
              className="w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {tiers.length > 1 && (
              <button type="button" onClick={() => removeTier(i)} className="text-red-500 hover:text-red-600 text-xs">
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">Product overrides (optional)</label>
          <button type="button" onClick={addOverride} className="text-xs text-blue-700 hover:text-blue-800 font-medium">
            + Add override
          </button>
        </div>
        {overrides.map((ov, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              required
              placeholder="Product code"
              value={ov.productCode}
              onChange={(e) => updateOverride(i, { productCode: e.target.value })}
              className="w-40 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              required
              type="number"
              step="0.0001"
              min="0"
              max="1"
              placeholder="Rate"
              value={ov.rate}
              onChange={(e) => updateOverride(i, { rate: Number(e.target.value) })}
              className="w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button type="button" onClick={() => removeOverride(i)} className="text-red-500 hover:text-red-600 text-xs">
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-blue-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 hover:bg-blue-600 transition"
      >
        {loading ? 'Saving…' : 'Create rule set'}
      </button>
    </form>
  );
}