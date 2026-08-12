# Universal Contracts — Code Reference

Concrete compliant and non-compliant examples for each of the 6 MADLABS Universal Contracts. Use this during implementation and code review. Full rules in [MADLABS_STANDARDS.md](MADLABS_STANDARDS.md).

---

## Contract 1: Plan First

Every GitHub Issue must contain Gherkin Acceptance Criteria before development begins.

**Compliant:**
```gherkin
Feature: Leave Request Approval

  Scenario: Manager approves a pending leave request
    Given a leave request exists with status "pending"
    And the authenticated user has the "manager" role in the same company
    When the manager calls POST /api/v1/leave/{id}/approve
    Then the leave request status becomes "approved"
    And the employee receives an email notification

  Scenario: Non-manager cannot approve leave
    Given a leave request exists with status "pending"
    And the authenticated user has the "employee" role
    When the employee calls POST /api/v1/leave/{id}/approve
    Then the response is 403 Forbidden
    And the leave request status remains "pending"
```

**Non-compliant:**
```
Description: Add leave approval.
// No Given/When/Then — not acceptable
```

---

## Contract 2: Type Safety

**Compliant — `unknown` + type guard:**
```typescript
function parseUser(raw: unknown): User {
  if (
    typeof raw !== 'object' || raw === null ||
    typeof (raw as Record<string, unknown>).id !== 'number' ||
    typeof (raw as Record<string, unknown>).email !== 'string'
  ) {
    throw new Error('Invalid user shape');
  }
  return raw as User;
}
```

**Non-compliant:**
```typescript
// Never use any
function parseUser(raw: any): User { return raw; }
```

**Compliant — Zod schema on every inbound request:**
```typescript
import { z } from 'zod';

const CreateLeaveSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  type: z.enum(['annual', 'casual', 'medical']),
  reason: z.string().min(1).max(500),
});

// In controller — throws ZodError automatically if invalid
const body = CreateLeaveSchema.parse(req.body);
```

**Non-compliant:**
```typescript
// Destructuring without validation
const { startDate, endDate, type } = req.body;
```

---

## Contract 3: Standard API Response

**Compliant — success:**
```typescript
res.json({ data: user });                              // single resource
res.json({ data: users, meta: { total: 42 } });       // collection
res.status(201).json({ data: createdLeave });
```

**Non-compliant — success:**
```typescript
res.json(user);                             // bare object
res.json({ success: true, user });          // custom shape
res.json({ result: users, count: 42 });     // non-standard keys
```

**Compliant — error:**
```typescript
res.status(400).json({
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details: [{ field: 'startDate', message: 'Must be a valid ISO datetime' }],
  },
});

res.status(403).json({
  error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
});
```

**Non-compliant — error:**
```typescript
res.status(400).json({ message: 'bad input' });          // no code field
res.status(500).json({ error: 'Something went wrong' }); // string, not object
```

---

## Contract 4: Test-Driven Development

**Required commit sequence:**
```bash
# 1. Write failing test, commit
git add src/services/__tests__/leave.service.test.ts
git commit -m "test: failing test for leave approval"

# 2. Write minimum code, commit
git add src/services/leave.service.ts
git commit -m "feat: implement leave approval"

# 3. Refactor if needed, commit
git add src/services/leave.service.ts
git commit -m "refactor: extract approval guard"
```

**Compliant test (Jest):**
```typescript
describe('LeaveService.approve', () => {
  it('approves a pending request for an authorised manager', async () => {
    const leave = await createLeave({ status: 'pending', companyId: 1 });
    const manager = { id: 99, companyId: 1, role: 'manager' };

    const result = await leaveService.approve(leave.id, manager);

    expect(result.status).toBe('approved');
    expect(result.approvedById).toBe(manager.id);
  });

  it('throws FORBIDDEN when a non-manager calls approve', async () => {
    const leave = await createLeave({ status: 'pending', companyId: 1 });
    const employee = { id: 5, companyId: 1, role: 'employee' };

    await expect(leaveService.approve(leave.id, employee))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
```

---

## Contract 5: Multi-Tenancy Isolation

**Compliant — Prisma (HR, ACMS):**
```typescript
// companyId always from req.user — never from req.body
async findLeaveRequests(filters: LeaveFilters, user: AuthUser) {
  return this.prisma.leaveRequest.findMany({
    where: { companyId: user.companyId, ...filters },
  });
}
```

**Non-compliant:**
```typescript
// Missing companyId scope
async findLeaveRequests(filters: LeaveFilters) {
  return this.prisma.leaveRequest.findMany({ where: filters });
}

// companyId from request body (attacker-controlled)
async findLeaveRequests(req: Request) {
  return this.prisma.leaveRequest.findMany({
    where: { companyId: req.body.companyId },
  });
}
```

**Compliant — EF Core / MKS:**
```csharp
// RLS enforces isolation automatically when ITenantContext is active.
// New tenant-scoped tables must call IRlsService.CreateRlsPolicy().
public async Task<IEnumerable<KpiRecord>> GetKpisAsync()
{
    return await _context.KpiRecords.ToListAsync(); // RLS filters by tenant
}
```

---

## Contract 6: Financial Precision

**Compliant:**
```typescript
import Decimal from 'decimal.js';

// EPF employee contribution (Sri Lanka: 8%)
function calculateEpfEmployee(grossSalary: Decimal): Decimal {
  return grossSalary.mul(new Decimal('0.08')).toDecimalPlaces(2);
}

// Commission
function calculateCommission(amount: Decimal, ratePercent: Decimal): Decimal {
  return amount.mul(ratePercent).div(new Decimal('100')).toDecimalPlaces(2);
}

const salary = new Decimal('150000.00');
const epf = calculateEpfEmployee(salary); // Decimal('12000.00') — exact
```

**Non-compliant:**
```typescript
// IEEE 754 floating-point loses precision
const salary = 150000.00;
const epf = salary * 0.08; // 12000.000000000002 — wrong for payroll

// number type in financial interfaces
interface Payslip {
  grossSalary: number; // should be Decimal or string representation
}
```
