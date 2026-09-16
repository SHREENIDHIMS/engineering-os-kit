---
name: preflight-review
description: Focused workflow for preflight review.
---

# preflight-review

## When to use

Use **before the first edit** on a non-trivial task to confirm scope, duplicates, interfaces, and verification plan are understood.

## Procedure

1. Run Engineering OS pickup gate: `node scripts/engineering-os.mjs pre-task-check --target .` — resolve handoff backlog or missing task first.
2. Read `.engineering-os/LESSONS_LEARNED.md` and `.engineering-os/MISTAKES.md`; note enforced rules that constrain this work.
3. Search for existing implementations of the same symbol, route, service, or config key — record hits with `path:line`.
4. Map **affected interfaces**: public APIs, DB tables, env vars, CLI flags, and external consumers; list breaking vs compatible changes.
5. Draft acceptance criteria as testable statements (not implementation steps) and the verification commands that will prove each.
6. Identify top three risks (data loss, auth regression, performance, dependency drift) and how each will be checked.
7. Open the task with criteria locked: `node scripts/engineering-os.mjs start-task --target . --title "..." --owner "..." --acceptance "criterion1|criterion2"`.

## Exit criteria

- Active task exists with acceptance criteria matching the agreed scope.
- Duplicate search documented — reuse decision made before new files are created.
- Affected interfaces and risks listed; verification plan names exact commands.
- Pickup gate (`pre-task-check`) passes; no blocked handoff state.
