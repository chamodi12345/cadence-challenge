-- Cadence — starting schema.
--
-- This is deliberately minimal and deliberately incomplete. It exists so the seed data
-- and the legacy reporting module have something to run against. It is NOT the schema
-- your finished system should have.
--
-- Things you will notice are missing: users, roles, commission rules, payout line items,
-- refunds, and any audit trail. Several constraints that ought to exist do not. Deciding
-- what belongs here is the assignment, not the starting point.
--
-- Replace this with real migrations once you have made your ORM/driver decision.

DROP TABLE IF EXISTS payout_runs CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

CREATE TABLE companies (
  id          TEXT PRIMARY KEY,
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agents (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  agent_code  TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'ACTIVE',
  ended_at    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Agent codes are unique WITHIN a company, not globally. AG-001 exists in more than
  -- one company in the seed data.
  CONSTRAINT agents_company_code_unique UNIQUE (company_id, agent_code)
);

CREATE TABLE bookings (
  id            TEXT PRIMARY KEY,
  company_id    TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  external_ref  TEXT NOT NULL,
  agent_code    TEXT NOT NULL,
  booking_date  DATE NOT NULL,
  amount        NUMERIC(14, 2) NOT NULL,
  currency      CHAR(3) NOT NULL DEFAULT 'LKR',
  product_code  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bookings_company_date_idx ON bookings (company_id, booking_date);
CREATE INDEX bookings_company_agent_idx ON bookings (company_id, agent_code);

CREATE TABLE payout_runs (
  id            TEXT PRIMARY KEY,
  company_id    TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  run_no        INTEGER NOT NULL,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'DRAFT',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
