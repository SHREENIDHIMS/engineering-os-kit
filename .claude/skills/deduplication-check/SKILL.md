---
name: deduplication-check
description: Focused workflow for deduplication check.
---

# deduplication-check

## When to use

Use **before creating** a new module, service, script, skill, or config block when similar functionality may already exist under a different name.

## Procedure

1. Write the capability in plain language (one sentence) and list 3–5 grep tokens: function names, route paths, env keys, error strings.
2. Search the repository with multiple patterns — exact symbol, fuzzy stem, and folder conventions (`rg`, filename glob, import graph).
3. Open the top 3 hits; compare inputs, outputs, side effects, and test coverage — not just file names.
4. Decide **extend existing**, **wrap existing**, or **create new**; if new, state why reuse fails (e.g., conflicting lifecycle, incompatible dependency).
5. Check adjacent kits: `.claude/skills/`, `.claude/agents/`, `scripts/`, and shared `lib/` folders for parallel implementations.
6. Record the decision on the active task with source references: `node scripts/engineering-os.mjs update-task --target . --task <id> --locations "existing/path:line|new/path:line"`.
7. If consolidating duplicates is in scope, delete or redirect the loser in the same PR — do not leave two sources of truth.

## Exit criteria

- Search tokens and hit list documented (including negative search — what was not found).
- Reuse-or-new decision stated with concrete `path:line` evidence.
- No duplicate public entry points introduced without deprecation plan.
- Consolidation completed when duplicate was confirmed and in scope.
