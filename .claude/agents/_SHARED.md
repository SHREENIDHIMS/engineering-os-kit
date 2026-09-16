# Shared agent procedure

## Before pickup
- Read root CLAUDE.md, AGENTS.md, and `.engineering-os/LESSONS_LEARNED.md`.
- Run `node scripts/engineering-os.mjs list-lessons --status enforced`.
- Run `git status --short --branch`.
- Run `node scripts/engineering-os.mjs pre-task-check` or confirm active task via `show-task`.
- Search for existing implementations before creating anything.

## Before writing code
- Define scope and non-goals; confirm acceptance criteria on the active task.
- Check compatibility, duplicates, tests, dependencies, and migrations.

## During implementation
- Smallest safe change; reuse abstractions; test after each slice.
- Update task locations: `node scripts/engineering-os.mjs update-task --task <id> --locations "path:line"`.

## Verification
- Record evidence: `node scripts/engineering-os.mjs record-evidence --owner <role> --command "..." --summary "..."`.
- Run applicable lint, tests, and security checks.

## Completion evidence
- Report changed `path:line` locations, evidence IDs, risks, and Git state.
- Close with `node scripts/engineering-os.mjs verify-task --task <id>` — never claim complete without it.

## Stop conditions
- Stop for authorization on destructive action, production data loss, credentials, or unapproved breaking changes.
