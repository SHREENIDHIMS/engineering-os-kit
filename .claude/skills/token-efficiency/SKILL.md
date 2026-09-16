---
name: token-efficiency
description: Focused workflow for token efficiency.
---

# token-efficiency

## When to use

Use when the codebase is large or the session budget is tight and you must **answer or implement with minimal context loading**.

## Procedure

1. State the precise question or change in one sentence — reject scope creep before opening files.
2. Build a **source shortlist** with targeted search (`rg`, `Glob`) for symbols/routes/tests named in the task; do not read directory trees wholesale.
3. Rank candidates: entry file → direct importers/callers → nearest test — stop when the chain answers the question.
4. Read only required line ranges; skip generated/vendor/lockfile blobs unless the task explicitly concerns them.
5. Write an **exclusion list** (paths deliberately not read) and why each is safe to omit.
6. Batch independent lookups in parallel tool calls; never re-read the same file in the same session without a new reason.
7. Attach the final source set to the task: `node scripts/engineering-os.mjs update-task --target . --task <id> --locations "path:line|..."` listing files actually consulted.

## Exit criteria

- Relevant source set and exclusion list are explicit in task notes or handoff.
- No full-repo reads when a symbol search would suffice.
- Answer or implementation cites only files that were actually loaded.
- Token-heavy detours (repeated unchanged reads, unrelated modules) avoided or justified.
