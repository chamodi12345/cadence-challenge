# Architecture Decision Records (ADR) Process

An ADR documents a significant architectural decision: what was decided, why, and what the trade-offs are. ADRs are permanent records — they explain *why* the codebase looks the way it does.

---

## When to Write an ADR

Write an ADR when the decision:
- Affects more than one project or service
- Introduces a new technology, framework, or external service
- Changes a shared interface (API contract, shared types, database schema)
- Replaces an existing approach (e.g., switching ORMs, changing auth strategy)
- Has significant security, cost, or performance implications
- Will confuse a future engineer reading the code without context

**Do NOT write an ADR for:** implementation choices within a single task, naming decisions, minor refactors, or anything reversible in under 2 hours.

---

## Where ADRs Live

```
MADLABS-operations/engineering/adrs/
├── ADR-0001-use-prisma-over-typeorm.md
├── ADR-0002-decimal-js-for-financial-values.md
├── ADR-0003-zod-for-runtime-validation.md
└── ...
```

Number sequentially. Never delete or edit a superseded ADR — mark it `Status: Superseded by ADR-XXXX` and write a new one.

---

## ADR Template

Create `MADLABS-operations/engineering/adrs/ADR-NNNN-short-title.md`:

```markdown
# ADR-NNNN: [Short Title]

**Date:** YYYY-MM-DD  
**Status:** Proposed | Accepted | Superseded by ADR-XXXX  
**Decider:** [Name(s)]

## Context

What is the problem or situation that requires a decision? Include constraints, existing behaviour, and why the current approach is insufficient.

## Decision

What was decided? State it clearly and directly.

## Consequences

### Positive
- ...

### Negative / Trade-offs
- ...

## Alternatives Considered

| Option | Why rejected |
|---|---|
| Option A | ... |
| Option B | ... |

## References
- Link to related PR, issue, or external resource
```

---

## Review Process

1. **Author** creates the ADR file and opens a PR to `dev`.
2. **Tech Lead** reviews within 24 hours — checks that context is accurate and alternatives were genuinely considered.
3. **CTO** approves or requests changes within 48 hours of TL review.
4. Once merged, status is `Accepted`. Reference from code with a comment: `// ADR-0003: Zod chosen over Yup for strict unknown-type inference`.

---

## Referencing ADRs in Code

```typescript
// ADR-0002: Decimal.js required for all financial calculations to prevent IEEE 754 rounding errors
const epf = new Decimal(grossSalary).mul('0.08');
```

```csharp
// ADR-0007: EF Core + PostgreSQL RLS for tenant isolation — no explicit WHERE TenantId needed
return await _context.KpiRecords.ToListAsync();
```
