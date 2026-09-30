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
   **No AI attribution:** the message, author and committer must not credit or mention an AI tool, agent, model or provider — no AI `Co-Authored-By` trailers, no "Generated with …" lines, no session links. Confirm `git config user.name`/`user.email` are the owner's, not an AI identity. The same applies to tags, merge messages, PR titles/bodies and comments.
7. After commit, record boundary evidence if required by the task: `node scripts/engineering-os.mjs record-evidence --target . --command "git log -1 --stat" --exit-code 0 --summary "commit abc1234 on branch feature/x" --owner "..."`.

## Exit criteria

- `node scripts/engineering-os.mjs check-attribution --range <base>..HEAD` reports `clean: true`.

- Repository root, branch, and commit boundary are known and documented.
- Staged content matches task scope — no secrets, no unrelated files.
- Recovery plan noted if operation was interrupted (stash name, branch name, or WIP commit SHA).
- Git config was not modified; no destructive commands run without authorization.
