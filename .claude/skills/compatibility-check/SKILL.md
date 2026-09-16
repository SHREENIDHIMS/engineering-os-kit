---
name: compatibility-check
description: Focused workflow for compatibility check.
---

# compatibility-check

## When to use

Use when a change might alter **API contracts, schema, configuration keys, serialized data, or client/server version assumptions**.

## Procedure

1. Inventory the public surface being changed: HTTP routes, request/response models, CLI flags, env vars, DB columns, event payloads.
2. Find callers with repo search and dependency graphs — include external repos or docs if this project publishes a SDK/contract.
3. For each consumer, record expected version, required fields, and default behavior today.
4. Classify each behavior as **preserved**, **deprecated with shim**, or **intentionally breaking** — breaking requires explicit authorization.
5. Run contract or snapshot tests if they exist; add a focused regression test when the contract is implicit but critical.
6. Document migration steps for operators (config rename map, dual-write period, feature flag toggle order).
7. Attach compatibility proof to the task: `node scripts/engineering-os.mjs update-task --target . --task <id> --locations "path:line|..."` covering each changed contract point.

## Exit criteria

- Every identified caller mapped to preserved/breaking outcome — no unknown consumers left as "probably fine".
- Breaking changes authorized in writing; deprecation path defined when shimming.
- Contract/regression tests pass or gaps explicitly waived with compensating monitoring.
- Operator migration notes exist for config/schema changes.
