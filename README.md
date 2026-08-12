# Cadence — Starter Kit

This is the scaffold for the Dev Intern Challenge. Read `ASSIGNMENT.md` first — that document is the assignment. This one only tells you what is in the box.

Your Tech Lead will hand you a repository with this directory already committed on `dev`. Do not work inside `MADLABS-operations`.

---

## What you are given

| Path | What it is |
|---|---|
| `docker-compose.yml` | PostgreSQL 15 on port 5433 (5433, not 5432 — so it does not collide with anything else you have running) |
| `db/schema.sql` | A **minimal** starting schema. It is not the right schema. Evolving or replacing it is your job |
| `scripts/reset-db.ts` | Applies `db/schema.sql` and seeds. Refuses to run against a non-local database |
| `scripts/seed.ts` | Two companies, five agents, 28 bookings |
| `src/legacy/` | An internal reporting helper written by a contractor who has left. It runs. It has bugs. See §3 of the brief |
| `fixtures/bookings-2026-03.csv` | A real-shaped export. It is messy on purpose |
| `docs/adr/ADR-0000-template.md` | The MADLABS ADR format |
| `docs/reference/` | The two MADLABS standards you are held to: the ADR process and the Universal Contracts (API response shape, type safety, financial precision). Read both before Day 2 |
| `QUESTIONS.md`, `DEFECTS.md`, `AI_USAGE.md`, `CHANGELOG.md` | Deliverable stubs. Fill them in as you go, not on Friday afternoon |

Everything else — the API, the auth, the import pipeline, the rules engine, the payout runs, the React app, your own migrations — you build.

## What you are *not* given, deliberately

No API server, no folder structure for your application code, no ORM decision, no test fixtures beyond the CSV. How you lay out `src/` is one of the things being assessed. `src/legacy/` is the only directory whose shape is fixed, because it is pretending to be pre-existing code.

---

## Setup

Requires Docker and Node 20.

```bash
npm install
cp .env.example .env          # Windows: copy .env.example .env
npm run db:up                 # starts PostgreSQL 15 on localhost:5433
npm run db:reset              # applies schema.sql, then seeds
npm test
```

`npm run db:reset` **drops and recreates every table**. It is a development convenience for a throwaway container, not a migration tool. Writing real migrations is part of your task.

## Scripts

| Command | Does |
|---|---|
| `npm run db:up` / `npm run db:down` | Start / stop the database container |
| `npm run db:reset` | Drop, recreate, reseed |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest, watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run format` | Prettier |
| `npm run verify` | lint + typecheck + test. **This is what your CI must run** |

`npm run verify` passes on the kit as delivered. Keep it that way — a red `verify` on `dev` at any point during the week is visible in your commit history and counts against delivery hygiene.

---

## Seeded data

Two companies, so tenant isolation is testable from the first minute:

- **Northwind Lanka** — agents `AG-001` (Nimal), `AG-002` (Kavya), `AG-003` (Ruwan, left the company mid-March)
- **Acme Ceylon** — agents `AG-001` (Dilani), `AG-010` (Suresh)

Note that `AG-001` exists in **both** companies. Agent codes are unique per company, not globally. Several things in this exercise depend on that, and at least one of them is not obvious.

Bookings span February and March 2026, in LKR.

---

## Ground rules

- Base branch is `dev`. Branch per increment, PR per branch, self-review comment on your own diff before you merge it.
- Conventional commits: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`.
- **Your repository is public.** Never commit a real secret. `.env` is gitignored; keep it that way. Push protection is a backstop, not a plan. If you do leak something, say so immediately.
- Set up GitHub Actions running `npm run verify` on every PR. Keep it under two minutes.
- Questions go in `QUESTIONS.md` and the repo issue thread, in writing. You get an answer within 4 business hours. If you are blocked, record your assumption as `ASSUMED` and keep working.
