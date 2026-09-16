---
name: plan-execute-verify
description: Focused workflow for plan execute verify.
---

# plan-execute-verify

## When to use

Use when executing an **approved implementation plan** that must be traceable slice-by-slice with evidence before closure.

## Procedure

1. Read `.engineering-os/LESSONS_LEARNED.md`, then gate pickup: `node scripts/engineering-os.mjs pre-task-check --target .`.
2. Open or create the task with explicit acceptance criteria: `node scripts/engineering-os.mjs start-task --target . --title "..." --owner "..." --acceptance "criterion1|criterion2"`.
3. Break the approved plan into **vertical slices** — each slice names one behavior change, affected `path:line` targets, and the single command that proves it.
4. Implement **one slice only**; after each slice, attach locations: `node scripts/engineering-os.mjs update-task --target . --task <id> --locations "src/foo.py:12|tests/test_foo.py:40"`.
5. Run the slice verification command locally; on success record proof: `node scripts/engineering-os.mjs record-evidence --target . --command "..." --exit-code 0 --summary "..." --owner "..."`.
6. Repeat steps 4–5 until every acceptance criterion has at least one linked evidence ID on the task.
7. Run closure validation: `node scripts/engineering-os.mjs verify-task --target . --task <id>` — fix gaps (missing locations, open incidents without enforced lessons) before claiming done.

## Exit criteria

- Every acceptance criterion maps to changed `path:line` locations and at least one evidence record.
- `verify-task` exits 0 and task status becomes `complete`.
- No open high/critical incidents without a linked enforced lesson.
- Scope matches the approved plan — no drive-by refactors.
