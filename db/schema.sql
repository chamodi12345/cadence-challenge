-- db/schema.sql — reconciled: TEXT ids throughout, to match the fixed seed data
DROP TABLE IF EXISTS payout_line_items CASCADE;
DROP TABLE IF EXISTS commission_product_overrides CASCADE;
DROP TABLE IF EXISTS commission_tiers CASCADE;
DROP TABLE IF EXISTS commission_rule_sets CASCADE;
DROP TABLE IF EXISTS payout_runs CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TYPE IF EXISTS user_role;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;



CREATE TYPE user_role AS ENUM ('COMPANY_ADMIN', 'FINANCE', 'AGENT');

CREATE TABLE companies (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agents (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  agent_code  TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'ACTIVE',
  ended_at    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agents_company_code_unique UNIQUE (company_id, agent_code)
);

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  company_id    TEXT NOT NULL REFERENCES companies(id),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          user_role NOT NULL,
  agent_id      TEXT REFERENCES agents(id),
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  password_reset_required_by TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (company_id, email)
);

CREATE TABLE bookings (
  id            TEXT PRIMARY KEY,
  company_id    TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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
  company_id    TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  run_no        INTEGER NOT NULL,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'DRAFT',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE commission_rule_sets (
  id             TEXT PRIMARY KEY,
  company_id     TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  effective_from DATE NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, effective_from)
);

CREATE TABLE commission_tiers (
  id           TEXT PRIMARY KEY,
  rule_set_id  TEXT NOT NULL REFERENCES commission_rule_sets(id) ON DELETE CASCADE,
  min_volume   NUMERIC(14, 2) NOT NULL,
  max_volume   NUMERIC(14, 2),           -- NULL = open-ended top tier
  rate         NUMERIC(6, 4) NOT NULL,    -- e.g. 0.0500 = 5%
  CONSTRAINT tiers_range_valid CHECK (max_volume IS NULL OR max_volume > min_volume)
);

CREATE TABLE commission_product_overrides (
  id           TEXT PRIMARY KEY,
  rule_set_id  TEXT NOT NULL REFERENCES commission_rule_sets(id) ON DELETE CASCADE,
  product_code TEXT NOT NULL,
  rate         NUMERIC(6, 4) NOT NULL,
  UNIQUE (rule_set_id, product_code)
);

CREATE INDEX rule_sets_company_effective_idx ON commission_rule_sets (company_id, effective_from);

CREATE TABLE payout_line_items (
  id                 TEXT PRIMARY KEY,
  run_id             TEXT NOT NULL REFERENCES payout_runs(id) ON DELETE CASCADE,
  agent_id           TEXT NOT NULL REFERENCES agents(id),
  agent_code         TEXT NOT NULL,
  booking_count      INTEGER NOT NULL,
  gross_volume       NUMERIC(14, 2) NOT NULL,
  commission_amount  NUMERIC(14, 2) NOT NULL,
  rates_applied      TEXT NOT NULL, -- human-readable summary, e.g. "5% tier; VISA override 2%"
  UNIQUE (run_id, agent_id)
);


CREATE TABLE teams (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE team_members (
  id       TEXT PRIMARY KEY,
  team_id  TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  is_lead  BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (team_id, agent_id)
);