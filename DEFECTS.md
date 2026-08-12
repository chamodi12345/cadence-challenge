# Defect Report — `src/legacy/`

At least three defects, each with a concrete reproduction. "This is bad practice" is not
a defect. "Given input X the function returns Y and it should return Z" is.

---

## D1 — [short title]

**Location:** `src/legacy/<file>.ts:<line>`
**Severity:** Critical | High | Medium | Low — and say whether it is a **security** issue
**Reproduction:** the exact input, and the wrong output it produces
**Root cause:** what is actually wrong, not what the symptom is
**Impact:** who is affected and how badly. For money bugs, quantify it
**Fix:** what you changed and why that is the right fix
**Regression test:** `src/legacy/<file>.test.ts::<test name>` — it must fail before the
fix and pass after. Commit the failing test first so the history shows it

---

## D2 — ...

## D3 — ...

---

## Anything you looked at and decided was *not* a defect

Worth writing down. Ruling something out deliberately is as much a signal as finding a
bug.
