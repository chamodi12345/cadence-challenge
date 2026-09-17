# ADR-0002: Refund Clawback Against Finalised Payout Runs

**Date:** 2026-09-16
**Status:** Accepted
**Decider:** Chamodi Chethana

## Context

A refund against a booking that has already been included in a finalised payout run means commission was paid out on money that the company has since returned to the customer. Cadence needs a way to recover that commission without mutating the finalised run (which is immutable by design — ADR-0001, ADR-0003 pending).

Key constraints:
- Finalised runs must never be edited (`status = 'FINALISED'` is a terminal state).
- Commission rule sets are effective-dated; a prior period's run was computed against the rule set that was effective on that period's start date.
- The `refunds` table already carries a `settled_run_id` column; only one refund per booking is allowed (`UNIQUE(booking_id)`).

The fundamental question: **when a refund is recorded, how and where is the clawback applied?**

## Decision

Record the refund in the `refunds` table only. Never modify the finalised run it affects.

Clawback is applied as a deduction merged into the **next** payout run for the same company when that run is generated:

1. During `generatePayoutRun`, after computing line items, a `computeClawbacks` pass selects refunds where:
   - the refund's booking was in a **finalised** run,
   - that run's `finalised_at` is not null,
   - `r.created_at > pr.finalised_at` (the refund was recorded *after* the run was finalised — i.e. commission was already paid out),
   - `pr.period_start < current period start` (the booking is in a prior period), and
   - `r.settled_run_id IS NULL OR r.settled_run_id = current run id` (has not been clawed back yet, or was clawed back by this same draft and is being regenerated).

2. For each affected `(original period, agent)` pair, the system recomputes:
   - `commission(all bookings for that agent in that period)` — using the original period's effective-dated rule set (stable), then
   - `commission(all bookings EXCEPT the refunded ones)`.

3. The difference is the clawback amount for that agent. If the agent's line item already exists in the current run, the clawback is subtracted; otherwise a new line item is inserted with a negative `commission_amount` and the label `refund clawback`.

4. All matched refund IDs are settled by setting `settled_run_id = current run id`, so the same refund is never clawed back twice.

Refunded bookings are also excluded from the current period's commission calculation via `NOT EXISTS (SELECT 1 FROM refunds r WHERE r.booking_id = bookings.id)` — this avoids double-paying commission on a refunded booking in a run generated after the refund.

`payout_runs.finalised_at` is stamped on the run at the moment it is finalised (not before), which makes the `r.created_at > pr.finalised_at` criterion a reliable guard: if a refund is recorded before a run is finalised, it will not trigger a phantom clawback in a later run.

## Consequences

### Positive

- The finalised run remains truly immutable; no write-back, no status toggle.
- One refund is clawed back exactly once — `settled_run_id` is idempotent across draft regenerations.
- The clawback is modelled as a deduction in the same currency/unit as the commission line items; no separate ledger.
- The per-(period, agent) recomputation uses the original effective-dated rule set, so the clawback matches exactly what was paid out.

### Negative / Trade-offs

- A refund recorded **between** `generate` and `finalise` of the same period's run will not be caught by either the exclusion (`NOT EXISTS`) or the clawback (`pr.period_start < current start`). The commission is under-recovered. This is a known gap documented in ADR-0002 — mitigated by the expectation that refunds are rare relative to run generation frequency and can be manually reconciled.
- The team-lead override (1% flat on team members' volume) is not specifically clawed back — it is embedded in the lead's line item. This means the lead retains the override even if a team member's booking is refunded. This is acceptable for the scale of the exercise but would require a dedicated adjustment in a production system.
- `resolveRuleSet` is called inside the clawback recompute loop, which adds a DB read per affected agent group. This is fine at the current scale; for production, a cache per `(company, period)` within the transaction would reduce redundant round-trips.

## Alternatives Considered

| Option | Why rejected |
| --- | --- |
| Edit the finalised run and re-derive line items | Violates the immutability invariant. Any run-level aggregation (reports, exports) would change. |
| Create a separate "adjustment" payout run per refund | Over-engineered at this scale; adds a new run to audit and reconcile for every refund. |
| Recompute all runs in sequence | Impractical for long-running companies; O(n) per refund. |
| Only apply clawback if `settled_run_id IS NULL` without the `finalised_at` guard | Could create a phantom clawback if the run's status was toggled during concurrency (now impossible with the atomic finalise fix, but `finalised_at` is also the only reliable signal of "commission was paid out"). |

## References

- `ADR-0001` — multi-tenant data model and finalised run immutability invariant.
- `db/schema.sql` — `refunds` table definition, `payout_runs.finalised_at` column.
- `src/payouts/payouts.service.ts` — `computeClawbacks`, `generatePayoutRun`, `finalizePayoutRun`.