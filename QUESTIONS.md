# Clarification Log

Every question you ask, the answer you got, and every assumption you made to unblock
yourself. Keep it current — a log written on Friday is worth nothing.

Status values: `OPEN` (asked, waiting), `ANSWERED`, `ASSUMED` (blocked, proceeded on my
own assumption).

---

## Q1 — Finance user across multiple companies

**Date asked:** 2026-08-12
**Status:** OPEN
**Question:** Can the same Finance user manage multiple companies? For example, can one Finance user have access to both Company A and Company B, or must each Finance user belong to exactly one company?

**Why it matters / what it blocks:** This affects the user/company relationship and tenant-isolation design. If a Finance user can manage multiple companies, the authentication and authorization model must determine which company the user is currently accessing.

**Answer:** ...

**Assumption made while waiting:** I will assume each user belongs to exactly one company until this is clarified.

**What I would have to change if the answer contradicts my assumption:** I would change the user/company relationship and authorization logic to support a user having access to multiple companies.

---

## Q2 — Commission rules across companies

**Date asked:** 2026-08-12
**Status:** OPEN
**Question:** Do all companies use the same commission rules and commission tiers, or can each company define and manage its own commission rules?

**Why it matters / what it blocks:** This affects the data model and commission-rule design. If each company can have different rules, commission rules must be associated with a specific company. If all companies share the same rules, the rules could potentially be managed globally.

**Answer:** ...

**Assumption made while waiting:** I will assume each company can have its own commission rules until this is clarified.

**What I would have to change if the answer contradicts my assumption:** I would change the commission-rule data model and authorization logic to support globally shared rules.


## Q3 — Refund after payout finalisation

**Date asked:** 2026-08-12
**Status:** OPEN

**Question:** What happens to the commission on a booking that is refunded after its payout run has been finalised?

The brief says finalised payout runs are immutable, while refunds can occur after finalisation. These rules require the refund/clawback to be handled somewhere other than by modifying the original payout run.

**Why it matters / what it blocks:** This affects the payout data model, refund handling, adjustment calculations, and how future payout runs account for previously overpaid commission.

**Answer:** ...

**Assumption made while waiting:** The refund will not modify the finalised payout run. Instead, the refund will be recorded against the booking and generate a negative adjustment line item. That adjustment will be included in the next payout run covering the affected agent.

For example, if an agent was overpaid 4,500 LKR in the previous month, the next payout will contain a -4,500 LKR adjustment.

**What I would have to change if the answer contradicts my assumption:** If Finance requires an immediate correction instead of a rolling adjustment, I would need to change the adjustment/payout design and calculation flow. I would not modify an already-finalised financial record.


## Q4 — Backend and frontend development order

**Date asked:** 2026-08-12
**Status:** OPEN

**Question:** Should we prioritize building the backend/API first and then build the React frontend, or are we expected to develop the backend and frontend together during the challenge?

**Why it matters / what it blocks:** This affects my implementation plan and how I divide the development time between the backend and frontend.

**Answer:** ...

**Assumption made while waiting:** I will develop the backend and frontend incrementally in parallel, building the API/data model and the corresponding React UI together for each feature.

**What I would have to change if the answer contradicts my assumption:** I would adjust the development order based on the expected workflow and priorities.


## Q5 — Docker performance issue

**Date asked:** 2026-08-12
**Status:** OPEN

**Question:** After starting the Docker database container, my laptop becomes noticeably slow/stuck. Is there any recommended Docker configuration or resource setting for this challenge?

**Why it matters / what it blocks:** Docker is required for the PostgreSQL database, but the performance issue may affect development and testing during the challenge.

**Answer:** ...

**Assumption made while waiting:** I will continue working on the project using the provided Docker setup, even though starting Docker makes my laptop slightly slow.

**What I would have to change if the answer contradicts my assumption:** I will adjust the Docker configuration or development workflow based on the recommended setup.


## Q6 — Legacy module defect investigation

**Date asked:** 2026-08-12
**Status:** OPEN

**Question:** For the existing `legacy/` reporting module, should we only identify and fix the required three real defects, or are we expected to review the entire module and identify any additional issues we find? Also, should the existing module's current behaviour be preserved wherever it is not directly related to a confirmed defect?

**Why it matters / what it blocks:** I want to understand the expected scope of the legacy-code work so that I can focus on finding concrete defects, fixing them without changing intended behaviour, and adding regression tests without unnecessarily rewriting the existing module.

**Answer:** ...

**Assumption made while waiting:** I will focus on identifying at least three concrete defects, including any security-related defect, and will make the smallest changes necessary to fix them while preserving the existing module's intended behaviour and callers.

**What I would have to change if the answer contradicts my assumption:** I would adjust the scope of the legacy review and the extent of the fixes/tests based on the expected requirements.

## Q7 — Database isolation between companies

**Date asked:** 2026-08-12
**Status:** OPEN

**Question:** Should each company have its own separate database, or should all companies share the same PostgreSQL database with their data isolated using `company_id` and server-side tenant scoping?

**Why it matters / what it blocks:** This is an important architectural and data-model decision. Separate databases provide physical data isolation, while a shared database with tenant-scoped tables provides logical isolation. The decision affects the database structure, connection strategy, tenant isolation, backups, and application architecture.

**Answer:** ...

**Assumption made while waiting:** I will assume that all companies will use the same PostgreSQL database, with every company-owned record associated with a `company_id` and all queries scoped to the authenticated company.

**What I would have to change if the answer contradicts my assumption:** I would need to redesign the database/connection architecture to support separate databases or database schemas for each company.



## Q8 — User registration

**Date asked:** 2026-08-12
**Status:** OPEN

**Question:** Should users be able to register themselves through the
application, with the role selected during registration, or should
Company Admin users be created/invited by an existing administrator?

**Why it matters / what it blocks:** This affects the authentication
flow, user-management design, role assignment, and frontend screens.

**Answer:** ...

**Assumption made while waiting:** I will assume user accounts are
created by an authorized Company Admin rather than allowing public
self-registration, because roles such as COMPANY_ADMIN and FINANCE
should not be freely self-assigned.

**What I would have to change if the answer contradicts my assumption:**
I would add the required registration/invitation flow and adjust the
authentication and user-management design.


## Q9 — Company Admin vs Finance Admin responsibilities

Who is the main administrator of a company: `COMPANY_ADMIN` or `FINANCE`?

The requirements state that `COMPANY_ADMIN` can perform everything that a Finance Admin can do, plus manage users in their own company.

Could you please clarify:

1. Who creates the initial company?
2. Who creates the first `COMPANY_ADMIN`?
3. Can `COMPANY_ADMIN` create `FINANCE` users?
4. Can `COMPANY_ADMIN` create `AGENT` accounts?
5. Can `FINANCE` create `AGENT` accounts?
6. Can a company have multiple `COMPANY_ADMIN` users?

## Why it matters / what it blocks

This affects the role hierarchy, authentication flow, authorization rules, and user-management functionality.

## Current assumption

I will assume `COMPANY_ADMIN` is the primary administrator of the company.

`COMPANY_ADMIN` can manage users, including creating `FINANCE` and `AGENT` accounts.

`FINANCE` can perform finance-related operations but cannot manage company users unless explicitly allowed.

## If the answer is different

I would adjust the role permissions and user-management flow accordingly.



