/**
 * Helpers for the import preview screen, which shows the operator how many rows in an
 * uploaded file fall inside the period they are importing.
 *
 * Rows here are raw CSV rows — nothing has been parsed or normalised yet. The partner
 * export writes dates as `DD/MM/YYYY`.
 */
export interface RawCsvRow {
  external_ref: string;
  agent_code: string;
  date: string;
  amount: string;
  product_code: string;
}

/**
 * Normalises a CSV date to ISO `YYYY-MM-DD` so period comparisons sort correctly.
 * Partner exports write `DD/MM/YYYY`; already-ISO values are left untouched.
 * Anything unrecognised is returned as-is so the caller degrades rather than crashes.
 */
function toIsoDate(date: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (iso) return date;
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return date;
}

/**
 * @param periodStart ISO `YYYY-MM-DD`
 * @param periodEnd   ISO `YYYY-MM-DD`
 */
export function filterCsvRowsByPeriod(
  rows: RawCsvRow[],
  periodStart: string,
  periodEnd: string,
): RawCsvRow[] {
  return rows.filter((row) => {
    const date = toIsoDate(row.date);
    return date >= periodStart && date <= periodEnd;
  });
}

export function countRowsInPeriod(
  rows: RawCsvRow[],
  periodStart: string,
  periodEnd: string,
): number {
  return filterCsvRowsByPeriod(rows, periodStart, periodEnd).length;
}
