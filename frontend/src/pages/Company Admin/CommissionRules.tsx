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
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-6 py-8 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="page-title">Commission Rules</h2>
            <p className="page-subtitle">
              Volume-tiered rates, effective-dated. Once a rule set's effective date has
              arrived, it locks — changing rates means creating a new rule set instead.
            </p>
          </div>
          <button onClick={() => setShowForm((v) => !v)} className={showForm ? 'btn-secondary' : 'btn-primary'}>
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
          <p className="text-sm text-slate-400">Loading rule sets…</p>
        )}

        {state === 'error' && (
          <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {state === 'ready' && ruleSets.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-slate-400">
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
    <div className="card space-y-4 overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-slate-100">{ruleSet.label}</h3>
            <span
              className={`badge ${
                locked ? 'bg-slate-500/20 text-slate-300' : 'bg-indigo-500/20 text-indigo-300'
              }`}
            >
              {locked ? 'Locked' : 'Upcoming'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Effective from {ruleSet.effectiveFrom}</p>
        </div>
        {!locked && (
          <button
            onClick={onDelete}
            className="rounded-md p-1.5 text-xs font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
            aria-label={`Delete ${ruleSet.label}`}
          >
            Delete
          </button>
        )}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-slate-400">
            <th className="pb-2 font-medium">Volume range</th>
            <th className="pb-2 font-medium">Rate</th>
          </tr>
        </thead>
        <tbody>
          {ruleSet.tiers.map((tier, i) => (
            <tr key={tier.id ?? i} className="border-b border-white/5 last:border-0">
              <td className="py-1.5 text-slate-100">
                {Number(tier.minVolume).toLocaleString()} –{' '}
                {tier.maxVolume ? Number(tier.maxVolume).toLocaleString() : 'and above'}
              </td>
              <td className="py-1.5 text-slate-400">{(tier.rate * 100).toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      {ruleSet.productOverrides.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            Product overrides
          </p>
          <div className="flex flex-wrap gap-2">
            {ruleSet.productOverrides.map((o, i) => (
              <span
                key={o.id ?? i}
                className="rounded-md bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-300"
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
    <form onSubmit={handleSubmit} className="card space-y-5 p-5">
      {error && (
        <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="label">Label</label>
          <input
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Standard rates — 2026"
            className="input w-full"
          />
        </div>
        <div className="space-y-1">
          <label className="label">Effective from</label>
          <input
            required
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            className="input w-full"
          />
          <p className="text-xs text-slate-500">
            Once this date arrives, this rule set locks and can no longer be edited or deleted.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="label">Volume tiers</label>
          <button type="button" onClick={addTier} className="text-xs font-medium text-indigo-300 hover:text-indigo-200">
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
              className="input w-32"
            />
            <span className="text-sm text-slate-500">–</span>
            <input
              placeholder="Max (blank = open-ended)"
              value={tier.maxVolume ?? ''}
              onChange={(e) => updateTier(i, { maxVolume: e.target.value || null })}
              className="input w-40"
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
              className="input w-32"
            />
            {tiers.length > 1 && (
              <button type="button" onClick={() => removeTier(i)} className="text-xs text-rose-400 hover:text-rose-300">
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="label">Product overrides (optional)</label>
          <button type="button" onClick={addOverride} className="text-xs font-medium text-indigo-300 hover:text-indigo-200">
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
              className="input w-40"
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
              className="input w-32"
            />
            <button type="button" onClick={() => removeOverride(i)} className="text-xs text-rose-400 hover:text-rose-300">
              Remove
            </button>
          </div>
        ))}
      </div>

      <button type="submit" disabled={loading} className="btn-primary px-4">
        {loading ? 'Saving…' : 'Create rule set'}
      </button>
    </form>
  );
}