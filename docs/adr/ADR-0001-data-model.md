# ADR-0001: Multi-Tenant Data Model

**Date:** 2026-08-12
**Status:** Proposed
**Decider:** Chamodi Chethana

Cadence is a system for managing companies, users, agents, bookings, commissions, and payouts.

The system will have multiple companies, so one company must not be able to see another company's data.

The system also needs to keep old payout calculations correct, even when commission rules change later. Finalised payouts must not be changed.

The starter data has multiple companies. It also shows that the same agent code, such as AG-001, can be used by different companies.

There are still some questions to clarify, such as whether one Finance user can work with multiple companies and whether each company should use a separate database or share one database.

## Decision

I will design the initial data model around company-scoped business
entities.

The main entities will be:

- Companies
- Finance Admin
- Company Admin
- Agents
- Bookings
- Commission rule sets
- Commission tiers
- Payout runs
- Payout line items
- Refunds / adjustments

Company-owned records will be associated with the relevant company
so that the API can enforce tenant isolation.

Agent codes will be treated as unique within a company rather than
globally.

Finalised payout runs will be treated as immutable. Historical payout
information required to explain a finalised calculation will be
preserved rather than relying only on the current commission rules.

The exact relationship between users and companies, and the database
isolation strategy, will be finalized after the clarification
questions are answered.

## Consequences

### Positive

- The system can handle many companies
- One company cannot easily see another company's data.
- Agent codes can safely be reused by different companies.
- Old payout amounts will stay correct even if commission rules change later.


### Negative / Trade-offs

- We must always make sure database queries use the correct company.
- The database will be a little more complicated because there are more relationships.
- We still need to decide how users can belong to companies.
- We need to store some extra payout information to keep old calculations correct.


## Alternatives Considered

| Option | Why rejected |
| --- | --- |
| Treat all companies as one shared tenant | This would not provide the required company-level isolation. |
| Make agent codes globally unique | The starter data demonstrates that agent codes are unique per company, not globally. |
| Recalculate historical payouts from the current commission rules | This could change historical results when rules change. |
| Separate database for every company | Not selected yet because database isolation is still being clarified. |

## References

- `ASSIGNMENT.md`
- `QUESTIONS.md`
- 