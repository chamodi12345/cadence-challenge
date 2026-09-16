# Defect Report — `src/legacy/`

Three defects found in the legacy reporting module, each with a regression test that
failed before the fix and passes after. The regression tests were committed first so
the history shows each of them failing.

---

## D1 — Agent summary leaks another company's bookings (tenant isolation)

**Location:** `src/legacy/bookingRepository.ts` — `findBookingsByAgentCode` (the query at
the former `WHERE agent_code = $1`, line 67 pre-fix). `buildAgentSummary` in
`src/legacy/agentSummary.ts:45` calls it with a `companyId` and trusts it to scope.
**Severity:** **High — security.** This breaks the most important rule in the system.
**Reproduction:** `findBookingsByAgentCode(pool, "acme-ceylon", "AG-001")` — the seed
data has `AG-001` in **both** Northwind Lanka (Nimal) and Acme Ceylon (Dilani). The
function accepts `companyId` but never puts it in the SQL, so the query is only
`WHERE agent_code = $1`. Wrong output: it returns Nimal's Northwind booking rows too.
The regression test inserts one booking into each of two companies under the same agent
code and asserted company A's call returns 1 row with `external_ref = 'A-REF'`. Against
the real seed data the function returned **14 rows** (both companies' `AG-001`
bookings); the test itself reproduced the leak with its own fixtures.
**Root cause:** `companyId` is a parameter that is silently dropped at the SQL level.
The query filters on `agent_code` only. Because agent codes are unique per company, not
globally (called out in the README), an agent code that exists in two companies makes
one company's finance report aggregate the other's bookings — the commission numbers
are wrong *and* the data is cross-tenant.
**Impact:** Cross-tenant data exposure plus incorrect money in any report built on
`buildAgentSummary`. The same call path is what an agent summary/dashboard would use.
**Fix:** Add `AND company_id = $2` to the query and pass `companyId` as the second
parameter. Two-line change, no behaviour change to the callers.
**Regression test:** `tests/legacy-agent-tenant-scope.test.ts:28` — fails before the fix
(returned both companies' rows), passes after.

---

## D2 — Period filter compares `DD/MM/YYYY` strings as if they were ISO dates

**Location:** `src/legacy/csvPeriod.ts` — `filterCsvRowsByPeriod`,
`return rows.filter((row) => row.date >= periodStart && row.date <= periodEnd)` (line 25
pre-fix).
**Severity:** High (reporting correctness — the import preview lies to the operator).
**Reproduction:** The module's own docstring says "the partner export writes dates as
`DD/MM/YYYY`". Rows are raw, unparsed CSV, so `row.date` is a `DD/MM/YYYY` string.
`filterCsvRowsByPeriod([{ date: '15/03/2026', ... }], '2026-03-01', '2026-03-31')`.
String comparison: `'15/03/2026' >= '2026-03-01'` is `false` (char-by-char, `'1' < '2'`),
so the row is dropped. Wrong output: a file that is entirely inside March is shown as **0
rows in period**. Ordering is broken even for two `DD/MM/YYYY` values (`'31/12/2025'` >
`'01/01/2026'` lexically).
**Root cause:** Comparing dates of two different formats by raw string inequality. ISO
`YYYY-MM-DD` sorts correctly by chance; `DD/MM/YYYY` does not, and the leading-day format
also breaks the day/month fields.
**Impact:** `countRowsInPeriod` — the preview screen's headline count — is wrong for
every real partner file. Under-counting means an operator cannot trust the pre-import
preview and may import the wrong period by accident.
**Fix:** Normalise each row date to ISO `YYYY-MM-DD` before comparing (`DD/MM/YYYY` →
`YYYY-MM-DD`; ISO passthrough; unrecognised values compare as-is so the module degrades
rather than crashing). Added as a private `toIsoDate` helper inside `csvPeriod.ts`.
**Regression test:** `src/legacy/csvPeriod.test.ts:22` (in-period row included) and
`:28` (count). Both failed before the fix, pass after.

---

## D3 — `toOffset` skips the first page of data

**Location:** `src/legacy/pagination.ts` — `toOffset`,
`return params.page * params.limit;` (line 35 pre-fix).
**Severity:** Medium (reporting correctness; first page of every paginated list is
missing).
**Reproduction:** The contract documented in the same file is "pages are 1-based.
`page=1` is the first page." `toOffset({ page: 1, limit: 25 })` returns `25`.
`listBookingsForPeriod` (`bookingRepository.ts:43`) uses it as the SQL `OFFSET`, so
page 1 returns rows **26–50**, not rows 1–25. Wrong output: the operator can never see
the oldest / first page of bookings for a period — it is silently skipped.
**Root cause:** 1-based `page` treated as a 0-based offset (`page * limit` instead of
`(page - 1) * limit`). Classic off-by-one.
**Impact:** Every paginated report is missing its first page and every page boundary is
shifted by one page. Combined with the skipping, data still "adds up" (page 2 shows
what should be page 1), so it is easy to miss in review.
**Fix:** `return (params.page - 1) * params.limit;`. All callers keep their existing
`page`/`limit` values; only the offset arithmetic changes.
**Regression test:** `src/legacy/pagination.test.ts:5` (`page=1 → offset 0`) and `:9`
(`page=2 → offset 25`, `page=3, limit=50 → offset 100`). Failed before, pass after.

---

