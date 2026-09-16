---
name: test-matrix
description: Focused workflow for test matrix.
---

# test-matrix

## When to use

Use when adding or changing behavior and you must **choose the right test layers** (unit, integration, contract, E2E, negative) from risk — not habit.

## Procedure

1. Classify the change: pure logic, DB boundary, HTTP/API surface, UI journey, auth/RBAC, or migration.
2. For each layer (unit → integration → contract → E2E → negative), mark **Required**, **Already covered**, or **Waived** with a one-line reason.
3. Search existing tests by symbol/route (`rg`, test file glob) before writing new files — extend nearby tests when possible.
4. Run the smallest proving command first (single test file or `-k` filter), then the package/project default test command.
5. For waived layers, document the compensating check (manual step, staging-only proof, or monitored production guard).
6. Record each executed command: `node scripts/engineering-os.mjs record-evidence --target . --command "pytest tests/..." --exit-code 0 --summary "integration: upload flow" --owner "..."`.
7. Link evidence IDs to the task: `node scripts/engineering-os.mjs update-task --target . --task <id> --evidence "EVD-..."`.

## Exit criteria

- Test matrix table (layer × decision × reason) exists in task notes or PR description.
- Every **Required** layer has a passing command recorded as evidence.
- Waived layers have explicit rationale — no silent gaps on auth, migrations, or public API changes.
- New tests fail on the pre-fix behavior (or bug reproduction is documented for pure refactors).
