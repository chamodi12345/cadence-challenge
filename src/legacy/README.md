# `legacy/` — internal reporting helper

> Written in 2025 by a contractor who is no longer with us. It backed the old
> "agent summary" report before that report was retired. We are keeping it because the
> new payout engine is expected to reuse parts of it.
>
> It runs. Nobody has looked at it closely in a while.

## Contracts this module is supposed to honour

These were documented in the original handover note and are still what the rest of the
system assumes:

1. **Pagination is 1-based.** `?page=1` returns the first `limit` rows. `?page=2` returns
   the next `limit` rows.
2. **A company may only ever see its own rows.** Every query that reaches the database
   takes a `companyId` and is expected to use it.
3. **Money is exact to two decimal places**, rounded half-up. Reports are reconciled
   against Finance's own spreadsheet totals to the cent.
4. **Dates coming out of the database are ISO (`YYYY-MM-DD`).** Dates coming out of the
   partner CSV export are `DD/MM/YYYY`. They have never been unified.
5. **Payout run numbers are sequential per company** and are shown to Finance on the
   payslip, so two runs must never share one.

## Your job

Find at least three real defects. See §3 of the brief. Fix them without rewriting the
module and without breaking its callers — write the regression test first, watch it fail,
then fix.

One of the defects has a security impact.
