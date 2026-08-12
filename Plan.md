# Cadence — One-Page Implementation Plan

## 1. Goal

Build Cadence as a commission and payout management system for
multiple companies.

The system will support:

- Users and roles
- Bookings
- Commission rules
- Payouts
- Refunds and adjustments
- Authentication
- Agent statements

---

## 2. Development Approach

I will develop the backend and frontend together, feature by feature.

I will start with the login and role-based access flow. Then I will
build each feature with its backend API, React UI, and tests.

The main roles are:

- COMPANY_ADMIN — manage the company and users
- FINANCE — manage bookings, commissions, and payouts
- AGENT — view their bookings and statement

I will run `npm run verify` regularly to make sure the project stays
working.

---

## 3. Data Model

I will design the PostgreSQL database around:

- Companies
- Users
- Agents
- Bookings
- Commission rules
- Payout runs
- Payout line items
- Refunds / adjustments

I will make sure each company's data is kept separate.

Some database decisions are still waiting for clarification from
the mentor.

---

## 4. Backend

I will build the backend using TypeScript and Express.

Main backend features:

- Login and authentication
- Role-based access
- Company/tenant isolation
- Booking APIs
- Commission APIs
- Payout APIs
- Agent statement APIs

Security and company access checks will be handled on the server.

---

## 5. Frontend

I will build the React/Vite frontend together with the backend.

Main screens:

- Login
- Register
- Role-based dashboard
- Booking/import page
- Commission rules page
- Payout page
- Agent statement page

Users will see the pages that are relevant to their role.

---

## 6. Booking Import

I will build the CSV booking import with:

- File/header validation
- Row validation
- Agent validation
- Date and amount validation
- Duplicate checking
- Accepted and rejected row counts
- Rejection reasons

I will test both valid and invalid CSV data.

---

## 7. Commission and Payouts

I will implement:

- Commission rules and tiers
- Monthly payout runs
- Payout calculations
- Payout line items
- Draft and finalised payout states
- Historical payout information

Refunds after a finalised payout will be handled as adjustments,
based on my current assumption and mentor clarification.

---

## 8. Legacy Module

I will review the existing `src/legacy/` module.

I will:

- Find at least three real defects
- Document them in `DEFECTS.md`
- Identify any security issue


I will avoid rewriting the whole module.

---

## 9. Testing

I will test the important areas first:

- Company/tenant isolation
- Role permissions
- Commission calculations
- Payout calculations
- Refund adjustments
- CSV imports
- Duplicate imports
- Agent leaving during a payout period
- Legacy defects

I will regularly run:

`npm run verify`

---

## 10. Documentation and Delivery

I will keep the project documentation updated:

- `QUESTIONS.md`
- `PLAN.md`
- `DEFECTS.md`
- `AI_USAGE.md`
- `CHANGELOG.md`
- ADR documents

I will use branches and conventional commits, create pull requests,
and keep the `dev` branch working correctly.