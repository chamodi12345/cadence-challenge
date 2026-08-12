# Dev Intern Challenge — "Cadence" Commission & Payout Console

**Audience:** Developer interns who have completed the frontend warm-up tasks.
**Duration:** 5 working days core + up to 2 days for stretch goals.
**Access required:** None to MADLABS production systems. You work in your own repository against a local database.

---

## 0. Read This First

This is not a coding exercise with a right answer. It is a small slice of the work we actually do: an under-specified business problem, a stakeholder who is busy, requirements that change halfway through, existing code that has bugs in it, and a deadline.

We are assessing six things:

1. How you think through a problem before writing code.
2. How you learn a stack you have not used before.
3. How you structure software so someone else can change it later.
4. How you justify decisions — including the ones you got wrong.
5. How you test, debug, and prove your work.
6. How you communicate in writing, asynchronously, to a stakeholder who is not sitting next to you.

**Finishing every requirement is not the goal.** A partial system that is well-reasoned, tested, documented, and honestly reported beats a feature-complete system you cannot explain. We have deliberately specified more work than fits in five days. Prioritising, and telling us what you dropped and why, is part of the assessment.

### On AI tools

Use them. We do. AI is part of how MADLABS ships software, and pretending otherwise would make this assessment useless.

Two conditions:

- Keep an `AI_USAGE.md` in your repo. Log which tools you used, roughly where, and — the part we actually read — what you changed about the output and why. "Claude generated the CSV parser; I rewrote the error handling because it swallowed malformed rows silently" is a strong entry.
- You must be able to explain every line in your repository during the technical review. If you cannot explain it, delete it before you submit. Code you do not understand is a liability, not a deliverable.

Declared AI use costs you nothing. Undeclared AI use that surfaces in the review is treated as a professionalism failure, not a technical one.

---

## 1. The Business Problem

MAD Group has sister companies that sell services through commissioned agents. Right now every one of them tracks agent commissions in spreadsheets. Finance spends the first week of every month reconciling those spreadsheets by hand, and disputes with agents are settled by arguing over email threads.

You are building **Cadence**: a small multi-tenant web application where finance teams import their sales bookings, define their commission rules, run a monthly payout, and let each agent see their own statement.

**Multi-tenant** means several companies use one deployment of Cadence, and no company may ever see another company's data. Treat this as the most important rule in the system.

### Who uses it

| Role | What they need |
|---|---|
| **Finance Admin** | Import bookings, define commission rules, run and finalise monthly payouts, export reports |
| **Company Admin** | Everything Finance Admin does, plus managing users in their own company |
| **Agent** | See their own bookings and their own statements. Nothing else. Ever. |

### The domain, in plain terms

- A **booking** is one sale: date, amount, product, and the code of the agent who made it.
- A **commission rule** says how much an agent earns. Rules are **tiered** on the agent's monthly booking volume, can be **overridden per product**, and are **effective-dated** — a company can change its rules from the 1st of next month without disturbing history.
- A **payout run** takes one company and one month, computes every agent's commission, and produces a set of line items totalling to a payable amount.
- A run can be **finalised**. Once finalised, it is a financial record.
- A booking can later be **refunded**. If the refund lands after the payout was finalised, the money has already gone out the door.

That last pair of sentences is where the interesting design work is. Think about it before you write a schema.

---

## 2. Scope

### 2.1 Functional Requirements

Requirements are tagged `MUST` (core, assessed directly), `SHOULD` (assessed if reached), and `MAY` (stretch — see §6).

**Authentication & Authorisation**

- `MUST` Email + password login issuing a JWT. Passwords hashed with bcrypt or argon2 — never stored or logged in plaintext.
- `MUST` Three roles: `COMPANY_ADMIN`, `FINANCE`, `AGENT`. Enforced server-side on every endpoint. Hiding a button in React is not authorisation.
- `MUST` Every authenticated request resolves to exactly one company. Every data query is scoped to it.
- `SHOULD` An `AGENT` can read their own bookings and statements and nothing else, including via direct API calls with a guessed ID.

**Booking Import**

- `MUST` Upload a CSV of bookings. A sample file is in the starter kit — it is deliberately messy, the way real exports are.
- `MUST` The import produces a **result summary**: rows accepted, rows rejected, and a per-row reason for each rejection. A silent partial import is a defect.
- `MUST` Re-uploading the same file must not double-count. Decide what makes a booking unique and defend that decision.
- `SHOULD` A rejected row never blocks the accepted rows in the same file — or it always does. Pick one, state it in the README, and be consistent.

**Commission Rules**

- `MUST` A company defines rule sets with volume tiers (e.g. 0–500,000 → 3%, 500,001–2,000,000 → 5%, above → 7%).
- `MUST` Rules are effective-dated. Changing a rule must not alter already-computed history.
- `SHOULD` Per-product override rates.
- `SHOULD` A UI for viewing rules. Editing via UI is nice; editing via API with a seeded example is acceptable.

**Payout Runs**

- `MUST` Generate a run for one company and one period. Output: one line item per agent, showing bookings counted, gross volume, rate(s) applied, and commission owed.
- `MUST` A run is `DRAFT` or `FINALISED`. Draft runs can be regenerated freely. Finalised runs cannot be mutated.
- `MUST` Money is exact. No floating-point currency arithmetic anywhere in the stack, including the frontend.
- `SHOULD` Refunds against bookings in a finalised run are handled without editing that run.

**Agent Statement**

- `MUST` An agent-facing view: their bookings for a period, the commission computed, and the run it belongs to.
- `SHOULD` CSV export of a statement.
- `SHOULD` Paginated and usable with 10,000 bookings in the table.

**Frontend**

- `MUST` React + Vite + TypeScript. Login, import screen with the result summary, payout run view, agent statement.
- `MUST` Loading, empty, and error states are handled. An unhandled rejected promise that leaves a blank screen is a defect.
- `SHOULD` It should be pleasant to use. It does not need to be beautiful.

### 2.2 Non-Functional Requirements

- **Stack (fixed):** TypeScript everywhere. Node 20 + Express. PostgreSQL 15 in Docker. Zod for request validation. Decimal.js (or equivalent exact-decimal type) for money. Jest or Vitest. React + Vite. ESLint + Prettier.
- **Stack (your call, justify in an ADR):** Prisma vs. the raw `pg` driver. We use both in production, for different reasons. We want to read yours.
- **Not allowed:** Next.js, a BaaS/auth SaaS (Firebase, Supabase Auth, Clerk), or an off-the-shelf commission library. Implement the auth and the domain logic yourself — that is the part being assessed.
- **Setup:** a fresh machine must reach a running app in five commands or fewer, documented in the README. `docker compose up` plus a seed script is the target.
- **Verify script:** `npm run verify` runs lint + typecheck + tests and exits non-zero on failure.
- **API contract:** every response follows the MADLABS shape — success `{ data: T, meta?: { total?: number } }`, error `{ error: { code, message, details?: [{ field, message }] } }`. See `docs/reference/UNIVERSAL_CONTRACTS_REFERENCE.md` in the starter kit.
- **Type safety:** `noImplicitAny` on. Use `unknown` plus a type guard instead of `any`. Every `any` you keep must be justified in a code comment.
- **Performance:** importing 1,000 rows completes in under 10 seconds on your laptop. An agent statement over 10,000 bookings returns in under 500ms. Measure it, do not estimate it — put the number in the README.
- **Logging:** structured (JSON) logs with a request ID that a reader can follow through one request. No secrets, tokens, or password fields in logs.
- **Secrets:** nothing real committed. `.env.example` with every variable, documented.
- **Tests:** we are not setting a coverage percentage, because coverage percentages are easy to game. We will instead ask: *what is the riskiest logic in your system, and what proves it works?* Money maths, tenant isolation, and import idempotency are the three we will look for by name.

---

## 3. The Existing Code

The starter kit contains a `legacy/` module — a small internal reporting helper "written by a contractor who has left". It runs. It has bugs.

- `MUST` Find at least **three** real defects in it.
- `MUST` Write `DEFECTS.md`. For each defect: where it is, what actually goes wrong (a concrete input and the wrong output, not "this is bad practice"), the impact, your fix, and a **regression test that fails before your fix and passes after**.
- One of the defects has a security impact. Say so explicitly if you find it, and rate the severity.

Do not rewrite the module wholesale. Fixing bugs in code you did not write, without breaking its callers, is the skill being tested.

---

## 4. How the Week Runs

Requirements will change during the week. That is intentional and it is not a trick — it is Tuesday.

| Day | You | Us |
|---|---|---|
| **Day 1 (half)** | Read the brief. Send your clarification questions in writing. Submit a one-page plan + `ADR-0001` on your data model. | Answer questions within 4 business hours |
| **Day 1–2** | Schema, auth, import, rules, tests | Change Request 1 lands Day 2 morning |
| **Day 3** | Payout runs, statements | Change Request 2 lands Day 3 morning |
| **Day 4** | Frontend, defect hunt | Change Request 3 lands Day 4 morning |
| **Day 5** | Change absorption, cleanup, peer review, demo prep | Review your peer's PR |
| **Day 5 PM** | 10-minute demo + 40-minute technical review | Scoring |

### Communication rules

- **All clarification goes in writing**, in `docs/QUESTIONS.md` and in your repo's issue thread. We reply within 4 business hours. We will not answer by phone or in person — remote-async is how MADLABS works, and your written communication is being assessed.
- **A blocked question does not block the day.** State your assumption, write it in `QUESTIONS.md` marked `ASSUMED`, and keep moving. Sitting idle waiting for an answer scores worse than a documented wrong assumption.
- **Daily standup note** in the repo thread: what moved, what is next, what is blocked. Three lines. Every day.
- **If you think a requirement is wrong, say so.** We would rather have the argument on Wednesday than ship the wrong thing on Friday. This applies to change requests too.

---

## 5. Deliverables

Submitted by end of Day 5:

1. **A Git repository** (public — we will create it and add you as a collaborator). Base branch `dev`. One feature branch and one pull request per increment — not one 4,000-line PR at the end. Conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`).
2. **Self-review on each PR:** at least one comment from you on your own diff, flagging something you are unsure about or a shortcut you took.
3. **`README.md`** — what it is, setup in ≤5 commands, how to run tests, your measured performance numbers, **and a "Known Gaps" section**. The Known Gaps section is scored. An empty one on an unfinished system scores zero.
4. **`docs/adr/`** — at least three ADRs in the MADLABS format (`docs/reference/ADR_PROCESS.md` in the starter kit). Mandatory topics: your data model, your ORM/driver choice, and your approach to refunds against finalised runs.
5. **`docs/QUESTIONS.md`** — every question you asked, the answer you got, and every assumption you made unblocked.
6. **`DEFECTS.md`** — the legacy defect report.
7. **`AI_USAGE.md`** — as described in §0.
8. **`CHANGELOG.md`** — Keep a Changelog format.
9. **`REVIEW.md`** — your written review of another intern's pull request (assigned Day 5 morning). Between three and eight findings, each with a suggested fix. Reviewing is a core engineering skill and we assess it directly.
10. **A 10-minute live demo.** Screen share, running app, real data. No slides.

### On CI

Set up a GitHub Actions workflow running `npm run verify` on every PR. Keep it under two minutes — do not install a browser toolchain to run unit tests.

You will not have branch protection rules available. Behave as if you did: no direct commits to `dev`, every change through a PR, and your own review comment on the diff before you merge it yourself.

Your repository is **public**, so treat it like production for secret hygiene. Nothing real in `.env`, ever — GitHub's push protection will block an obvious credential, but it is a backstop, not a plan. If you ever do commit something sensitive, tell us immediately: rotating a leaked secret takes minutes, discovering one later does not. Nothing in this exercise requires a real credential.

---

## 6. Stretch Goals

Only after the `MUST` list is genuinely done and tested. A half-finished stretch goal on top of a broken core scores negative — knowing when *not* to start something is itself a signal.

| # | Stretch goal | What it demonstrates |
|---|---|---|
| S1 | **What-if simulation** — preview a rule change against a closed month without saving | Separating calculation from persistence |
| S2 | **Concurrency safety** — two simultaneous finalise requests on one run; exactly one wins, provably. Include the test | Transactions, locking, race conditions |
| S3 | **PostgreSQL Row-Level Security** for tenant isolation instead of application-layer filtering, plus an ADR comparing the two | Depth on the problem MKS solves in production |
| S4 | **OpenAPI spec** generated from your Zod schemas, with a typed frontend client | Contract-first thinking |
| S5 | **Playwright E2E** covering login → import → run → statement | Test pyramid judgement |
| S6 | **Streaming import** that handles a 500MB CSV in constant memory | Backpressure, streams |
| S7 | **Observability** — a request ID propagated from the browser through the API into logs, and one meaningful metric | Production debuggability |
| S8 | **A working Dockerfile** that builds a production image and runs it locally with the same seed data | Deployment reality |

---

## 7. Acceptance Criteria

The submission is accepted for scoring when all of the following hold. This is a floor, not a grade.

```gherkin
Scenario: A reviewer sets the project up from scratch
  Given a machine with Docker and Node 20 and nothing else
  When the reviewer follows the README setup steps
  Then the app is running with seeded data in 5 commands or fewer
  And "npm run verify" passes

Scenario: Tenant isolation holds under direct attack
  Given a logged-in user of Company A
  And a booking belonging to Company B with a known ID
  When the user requests that booking directly by ID via the API
  Then the response is 404 or 403
  And no Company B data appears in the response body

Scenario: An agent cannot read another agent's statement
  Given a logged-in user with role AGENT
  When they request a statement belonging to a different agent in the same company
  Then the request is rejected

Scenario: Re-importing the same file does not double-count
  Given a CSV of 100 bookings has been imported successfully
  When the identical file is imported a second time
  Then the total booking count for the company is still 100
  And the import summary reports the duplicates explicitly

Scenario: Money is exact
  Given a commission rate that produces a repeating decimal
  When the payout run is generated
  Then the stored value is an exact decimal at the documented precision
  And the sum of all line items equals the run total to the cent

Scenario: A finalised run is immutable
  Given a payout run in FINALISED state
  When any request attempts to modify its line items or total
  Then the request is rejected
  And the existing values are unchanged

Scenario: A malformed import is reported, not swallowed
  Given a CSV where 7 of 100 rows are malformed
  When the file is imported
  Then the summary reports 7 rejections with a per-row reason
```

---

## 8. Scoring

You are scored out of 100, across your artifacts and the technical review.

| Area | Weight | What earns marks |
|---|---:|---|
| **Requirements & communication** | 10 | Quality and timing of clarification questions; documented assumptions; standup discipline; pushing back on a bad requirement |
| **Architecture & design decisions** | 15 | Data model fitness; separation of concerns; ADR quality — genuine alternatives, honest trade-offs |
| **Domain correctness** | 15 | Money exactness; tier and effective-date logic; refunds and finalised runs; edge cases |
| **Code quality & maintainability** | 12 | Readability; consistency; naming; sensible abstraction; absence of dead or speculative code |
| **Testing** | 13 | Tests targeting real risk; edge and unhappy paths; regression tests for the legacy defects; tests that would actually fail if the code broke |
| **Security & multi-tenancy** | 10 | Isolation enforced server-side everywhere; authorisation not just authentication; secret hygiene; input validation |
| **Debugging** | 5 | Depth of the legacy defect report; correct root causes; recognising the security-impacting one |
| **Documentation & delivery hygiene** | 10 | README; commit and PR discipline; incremental delivery; honest Known Gaps; peer review quality |
| **Technical review** | 10 | Explaining your own code and decisions; handling "why not X?"; reasoning aloud under a question you have not prepared for |

**Two conditions apply on top of the score:**

- Scoring below 4/10 on the technical review caps the overall result at 50, regardless of what was delivered. Code you cannot explain does not count as yours.
- Handling of the change requests is scored *within* the areas above — a change absorbed cleanly lifts Architecture; one that forces a rewrite of unrelated code exposes a coupling problem worth discussing rather than hiding.

---

## 9. What "Good" Looks Like

Concretely, from past strong submissions:

- Asked, on Day 1, whether tiers are marginal or cumulative — before designing the calculator.
- Shipped a `DRAFT`-only payout run on Day 2 with tests, then added finalisation on Day 3, instead of building everything and testing at the end.
- Wrote an ADR that says "I chose the simpler option knowing it will not scale past ~50k bookings per run; here is the specific thing that breaks first, and here is what I would change."
- Refused a change request in writing, with a reason, and proposed an alternative that met the underlying need.
- Had a `git revert` in the history with a commit message explaining what was wrong with the approach.
- Said "I don't know" in the technical review, then reasoned out loud toward an answer.

The last one carries more weight than people expect.

---

*Owner: CTO / Tech Lead · Reusable per intern cohort — regenerate the CSV fixture and rotate the legacy defects between cohorts.*
