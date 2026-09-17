# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Update this as you merge each PR, not at the end of the week.

## [Unreleased]

### Fixed

- Legacy: `findBookingsByAgentCode` now scopes by `company_id` — agent summaries no
  longer aggregate another company's bookings for the same agent code (security,
  see `DEFECTS.md` D1)
- Legacy: `filterCsvRowsByPeriod` now normalises partner `DD/MM/YYYY` dates to ISO
  before comparing — the import preview period count was always 0 on real exports
  (`DEFECTS.md` D2)
- Legacy: `toOffset` now uses `(page - 1) * limit` — page 1 of every paginated list
  was being skipped (`DEFECTS.md` D3)
- `DEFECTS.md` filled in with the three legacy defects and their regression tests

### Added

- Shared `HttpError` (`src/lib/HttpError.ts`)
- Pure commission calculator (`src/payouts/commission.ts`) with unit tests —
  tier/flat-vs-marginal semantics, product overrides, per-agent grouping
- Concurrency safety tests (S2): exactly one of two simultaneous finalise
  requests wins; concurrent generate calls produce one run and distinct
  run numbers
- Legacy defect hunt: `DEFECTS.md` with three defects (including a
  tenant-isolation/security one) and their regression tests
- Starter kit scaffold: PostgreSQL container, seed data, legacy reporting module

### Changed

### Fixed

- `finalizePayoutRun` is now an atomic conditional `UPDATE ... WHERE status =
  'DRAFT'` — two concurrent finalise requests can no longer both succeed
- Payout run generation now locks the company row inside the transaction, so
  concurrent generates cannot mint duplicate `run_no` or duplicate runs for
  one period
- `run_no` is computed as `MAX(run_no) + 1` instead of `COUNT(*) + 1`, which
  could collide after a run row was deleted
- Legacy: `findBookingsByAgentCode` now scopes by `company_id` — agent
  summaries no longer aggregate another company's bookings for the same agent
  code (security, see `DEFECTS.md` D1)
- Legacy: `filterCsvRowsByPeriod` now normalises partner `DD/MM/YYYY` dates to
  ISO before comparing — the import preview period count was always 0 on real
  exports (`DEFECTS.md` D2)
- Legacy: `toOffset` now uses `(page - 1) * limit` — page 1 of every paginated
  list was being skipped (`DEFECTS.md` D3)

### Removed

- Duplicate local `HttpError` class definitions from the payout service (now
  imported from `src/lib/HttpError`)