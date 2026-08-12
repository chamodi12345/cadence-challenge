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
 * @param periodStart ISO `YYYY-MM-DD`
 * @param periodEnd   ISO `YYYY-MM-DD`
 */
export function filterCsvRowsByPeriod(
  rows: RawCsvRow[],
  periodStart: string,
  periodEnd: string,
): RawCsvRow[] {
  return rows.filter((row) => row.date >= periodStart && row.date <= periodEnd);
}

export function countRowsInPeriod(
  rows: RawCsvRow[],
  periodStart: string,
  periodEnd: string,
): number {
  return filterCsvRowsByPeriod(rows, periodStart, periodEnd).length;
}
