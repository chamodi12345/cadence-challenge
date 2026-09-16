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

- Starter kit scaffold: PostgreSQL container, seed data, legacy reporting module

### Changed

### Fixed

### Removed
