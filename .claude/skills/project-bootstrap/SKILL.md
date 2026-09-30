---
name: project-bootstrap
description: Initialize Engineering OS on a new or existing Git project.
---

# project-bootstrap

## When to use

Use when onboarding a **new Git repository** or when `.engineering-os/` is missing and agents need a managed task/evidence store.

## Procedure

1. Confirm the target path resolves to a Git root: `git rev-parse --show-toplevel` inside the target directory.
2. Dry-run bootstrap and capture the plan with any kit copy — the global one at `~/.claude/engineering-os/kit/src/cli.mjs` (after `install-global`), a clone's `src/cli.mjs`, or `npx --yes github:shreenidhims/engineering-os-kit` — e.g. `node ~/.claude/engineering-os/kit/src/cli.mjs bootstrap --target <path>` (no `--apply`).
3. Review JSON output for `missingDirectories`, `agents.status`, and `projectFiles` — confirm nothing outside the Git root will be written.
4. Apply initialization with the same kit copy: `... init-project --target <path>` (installs adapter, creates store, appends managed `AGENTS.md`/`CLAUDE.md` sections once). Add `--replace` only if the user wants an existing `.claude/agents|skills|commands` moved to `.engineering-os/backups/`. Skip repos containing `.engineering-os-ignore`.
5. Validate safety and path discipline: `node scripts/engineering-os.mjs check-project-safety --target <path>`.
6. In the target repo, read `.engineering-os/LESSONS_LEARNED.md` and open the first task: `node scripts/engineering-os.mjs start-task --target <path> --title "..." --owner "..." --acceptance "criterion"`.
7. Confirm `.engineering-os/INDEX.md` lists the new task and that `state/project.json` records kit version metadata.

## Exit criteria

- `.engineering-os/{tasks,incidents,lessons,handoffs,decisions,evidence,state}/` exists with `INDEX.md`, `MISTAKES.md`, and `LESSONS_LEARNED.md`.
- `AGENTS.md` contains the managed Engineering OS contract (appended, never replacing existing body).
- `check-project-safety --target <path>` returns `valid: true`.
- An active task exists before the first code edit in the target project.
