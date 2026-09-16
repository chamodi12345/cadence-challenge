import { describe, expect, it } from 'vitest';
import { countRowsInPeriod, filterCsvRowsByPeriod, type RawCsvRow } from './csvPeriod';

const MARCH_ROWS: RawCsvRow[] = [
  {
    external_ref: 'R-IN-MARCH',
    agent_code: 'AG-001',
    date: '15/03/2026',
    amount: '100.00',
    product_code: 'P',
  },
  {
    external_ref: 'R-OUT-FEB',
    agent_code: 'AG-001',
    date: '05/02/2026',
    amount: '50.00',
    product_code: 'P',
  },
];

describe('filterCsvRowsByPeriod (regression: DD/MM/YYYY rows must be compared as dates)', () => {
  it('includes a row dated inside the period', () => {
    const rows = filterCsvRowsByPeriod(MARCH_ROWS, '2026-03-01', '2026-03-31');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.external_ref).toBe('R-IN-MARCH');
  });

  it('counts only rows inside the period', () => {
    expect(countRowsInPeriod(MARCH_ROWS, '2026-03-01', '2026-03-31')).toBe(1);
  });
});