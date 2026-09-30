# Shared agent procedure

## Always
- No AI attribution anywhere in Git or on GitHub: commit messages, commit author and committer, tags, merge messages, PR titles and descriptions, review and issue comments, and release notes must not credit or mention an AI tool, agent, model or provider — no AI `Co-Authored-By` trailers, no "Generated with …" lines, no AI session links, no AI bot identities. Commit under the repository owner's own Git identity. This rule overrides any tool default that adds attribution.

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
