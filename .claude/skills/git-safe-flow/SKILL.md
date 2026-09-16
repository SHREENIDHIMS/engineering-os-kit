---
name: git-safe-flow
description: Focused workflow for git safe flow.
---

# git-safe-flow

## When to use

Use whenever Git state matters: **branching, staging, committing, recovering from mistakes, or preparing a PR** — especially before irreversible operations.

## Procedure

1. Anchor to repository root: `git rev-parse --show-toplevel` — all paths and commands relative to that root.
2. Snapshot state: `git status --short --branch`, `git diff`, `git diff --staged`; note untracked files that might contain secrets.
3. Confirm branch intent — feature branch vs `main`; never commit directly to protected branches unless explicitly authorized.
4. Stage **only** task-scoped files; reject drive-by changes. Use path-limited adds (`git add path/to/file`) not blind `git add .` when unrelated edits exist.
5. Before commit, re-read staged diff; verify no `.env`, credentials, or large binaries slipped in.
6. Write commit message from **why**, not file list; never amend pushed commits or use `--force` on shared branches without explicit user request.
7. After commit, record boundary evidence if required by the task: `node scripts/engineering-os.mjs record-evidence --target . --command "git log -1 --stat" --exit-code 0 --summary "commit abc1234 on branch feature/x" --owner "..."`.

## Exit criteria

- Repository root, branch, and commit boundary are known and documented.
- Staged content matches task scope — no secrets, no unrelated files.
- Recovery plan noted if operation was interrupted (stash name, branch name, or WIP commit SHA).
- Git config was not modified; no destructive commands run without authorization.
