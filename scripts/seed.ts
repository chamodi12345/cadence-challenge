/**
 * Seed data for local development.
 *
 * Two companies exist so that tenant isolation is testable from the first minute.
 * Note that agent code AG-001 exists in BOTH companies — that is intentional.
 */
import type { Client } from 'pg';

type CompanyRow = { id: string; name: string };
type AgentRow = {
  id: string;
  companyId: string;
  agentCode: string;
  fullName: string;
  status: string;
  endedAt: string | null;
};
type BookingRow = {
  id: string;
  companyId: string;
  externalRef: string;
  agentCode: string;
  bookingDate: string;
  amount: string;
  productCode: string;
};

const COMPANIES: CompanyRow[] = [
  { id: 'cmp_northwind', name: 'Northwind Lanka (Pvt) Ltd' },
  { id: 'cmp_acme', name: 'Acme Ceylon Holdings' },
];

const AGENTS: AgentRow[] = [
  {
    id: 'agt_nw_001',
    companyId: 'cmp_northwind',
    agentCode: 'AG-001',
    fullName: 'Nimal Perera',
    status: 'ACTIVE',
    endedAt: null,
  },
  {
    id: 'agt_nw_002',
    companyId: 'cmp_northwind',
    agentCode: 'AG-002',
    fullName: 'Kavya Fernando',
    status: 'ACTIVE',
    endedAt: null,
  },
  {
    id: 'agt_nw_003',
    companyId: 'cmp_northwind',
    agentCode: 'AG-003',
    fullName: 'Ruwan Jayasuriya',
    status: 'LEFT',
    endedAt: '2026-03-15',
  },
  {
    id: 'agt_ac_001',
    companyId: 'cmp_acme',
    agentCode: 'AG-001',
    fullName: 'Dilani Rathnayake',
    status: 'ACTIVE',
    endedAt: null,
  },
  {
    id: 'agt_ac_010',
    companyId: 'cmp_acme',
    agentCode: 'AG-010',
    fullName: 'Suresh Kumar',
    status: 'ACTIVE',
    endedAt: null,
  },
];

/**
 * Amounts are strings, not numbers, all the way from here to the database. That is not
 * an accident — think about why before you change it.
 */
const BOOKINGS: BookingRow[] = [
  // --- Northwind, February 2026 ---
  b('nw', 1, 'cmp_northwind', 'NW-2026-0101', 'AG-001', '2026-02-03', '4100.00', 'TRAVEL'),
  b('nw', 2, 'cmp_northwind', 'NW-2026-0102', 'AG-001', '2026-02-11', '2750.50', 'TRAVEL'),
  b('nw', 3, 'cmp_northwind', 'NW-2026-0103', 'AG-002', '2026-02-14', '9800.00', 'INSURANCE'),
  b('nw', 4, 'cmp_northwind', 'NW-2026-0104', 'AG-002', '2026-02-19', '15250.75', 'INSURANCE'),
  b('nw', 5, 'cmp_northwind', 'NW-2026-0105', 'AG-003', '2026-02-22', '3300.00', 'TRAVEL'),
  b('nw', 6, 'cmp_northwind', 'NW-2026-0106', 'AG-001', '2026-02-28', '6400.25', 'VISA'),

  // --- Northwind, March 2026 ---
  // AG-001's March bookings sum to exactly 16,399.50. Reconciling that total, and the
  // commission derived from it, against Finance's spreadsheet is worth doing by hand
  // once before you trust any code.
  b('nw', 7, 'cmp_northwind', 'NW-2026-0201', 'AG-001', '2026-03-02', '5200.30', 'TRAVEL'),
  b('nw', 8, 'cmp_northwind', 'NW-2026-0202', 'AG-001', '2026-03-06', '4300.40', 'TRAVEL'),
  b('nw', 9, 'cmp_northwind', 'NW-2026-0203', 'AG-001', '2026-03-13', '3100.20', 'VISA'),
  b('nw', 10, 'cmp_northwind', 'NW-2026-0204', 'AG-001', '2026-03-21', '2000.10', 'INSURANCE'),
  b('nw', 11, 'cmp_northwind', 'NW-2026-0205', 'AG-001', '2026-03-31', '1798.50', 'TRAVEL'),

  b('nw', 12, 'cmp_northwind', 'NW-2026-0206', 'AG-002', '2026-03-01', '22000.00', 'INSURANCE'),
  b('nw', 13, 'cmp_northwind', 'NW-2026-0207', 'AG-002', '2026-03-09', '18750.65', 'INSURANCE'),
  b('nw', 14, 'cmp_northwind', 'NW-2026-0208', 'AG-002', '2026-03-17', '31200.40', 'TRAVEL'),
  b('nw', 15, 'cmp_northwind', 'NW-2026-0209', 'AG-002', '2026-03-24', '7425.95', 'VISA'),
  b('nw', 16, 'cmp_northwind', 'NW-2026-0210', 'AG-002', '2026-03-30', '12080.00', 'INSURANCE'),

  // AG-003 left on 2026-03-15. One booking before, one after.
  b('nw', 17, 'cmp_northwind', 'NW-2026-0211', 'AG-003', '2026-03-10', '5600.00', 'TRAVEL'),
  b('nw', 18, 'cmp_northwind', 'NW-2026-0212', 'AG-003', '2026-03-20', '2100.00', 'TRAVEL'),

  // Bookings on the very first and very last day of the period — period boundaries and
  // timezones are worth thinking about.
  b('nw', 19, 'cmp_northwind', 'NW-2026-0213', 'AG-002', '2026-03-01', '990.00', 'VISA'),

  // --- Northwind, April 2026 (outside the March period) ---
  b('nw', 20, 'cmp_northwind', 'NW-2026-0301', 'AG-001', '2026-04-02', '8800.00', 'TRAVEL'),
  b('nw', 21, 'cmp_northwind', 'NW-2026-0302', 'AG-002', '2026-04-08', '4300.00', 'INSURANCE'),

  // --- Acme, March 2026 ---
  // Acme also has an AG-001. Their data must never appear in a Northwind report.
  b('ac', 1, 'cmp_acme', 'AC-9001', 'AG-001', '2026-03-04', '55000.00', 'FREIGHT'),
  b('ac', 2, 'cmp_acme', 'AC-9002', 'AG-001', '2026-03-12', '48250.00', 'FREIGHT'),
  b('ac', 3, 'cmp_acme', 'AC-9003', 'AG-001', '2026-03-19', '61300.50', 'FREIGHT'),
  b('ac', 4, 'cmp_acme', 'AC-9004', 'AG-010', '2026-03-05', '12750.00', 'WAREHOUSE'),
  b('ac', 5, 'cmp_acme', 'AC-9005', 'AG-010', '2026-03-15', '9900.25', 'WAREHOUSE'),
  b('ac', 6, 'cmp_acme', 'AC-9006', 'AG-010', '2026-03-27', '17600.00', 'FREIGHT'),
  b('ac', 7, 'cmp_acme', 'AC-9007', 'AG-010', '2026-03-29', '3450.80', 'WAREHOUSE'),
];

function b(
  prefix: string,
  n: number,
  companyId: string,
  externalRef: string,
  agentCode: string,
  bookingDate: string,
  amount: string,
  productCode: string,
): BookingRow {
  return {
    id: `bkg_${prefix}_${String(n).padStart(4, '0')}`,
    companyId,
    externalRef,
    agentCode,
    bookingDate,
    amount,
    productCode,
  };
}

export async function seed(client: Client): Promise<void> {
  for (const company of COMPANIES) {
    await client.query('INSERT INTO companies (id, name) VALUES ($1, $2)', [
      company.id,
      company.name,
    ]);
  }

  for (const agent of AGENTS) {
    await client.query(
      `INSERT INTO agents (id, company_id, agent_code, full_name, status, ended_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [agent.id, agent.companyId, agent.agentCode, agent.fullName, agent.status, agent.endedAt],
    );
  }

  for (const booking of BOOKINGS) {
    await client.query(
      `INSERT INTO bookings
         (id, company_id, external_ref, agent_code, booking_date, amount, currency, product_code)
       VALUES ($1, $2, $3, $4, $5, $6, 'LKR', $7)`,
      [
        booking.id,
        booking.companyId,
        booking.externalRef,
        booking.agentCode,
        booking.bookingDate,
        booking.amount,
        booking.productCode,
      ],
    );
  }

  console.log(
    `seeded ${COMPANIES.length} companies, ${AGENTS.length} agents, ${BOOKINGS.length} bookings`,
  );
}
