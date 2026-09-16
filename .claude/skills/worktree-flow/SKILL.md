---
name: worktree-flow
description: Focused workflow for worktree flow.
---

# worktree-flow

## When to use

Use when you need **parallel, isolated working directories** (experiments, best-of-N, or long-running branches) without polluting the main checkout.

## Procedure

1. Record the source revision from the primary checkout: `git rev-parse HEAD` and current branch name.
2. Choose a dedicated worktree path **outside** the main working tree and a unique branch name (`feature/<slice>` or `exp/<id>`).
3. Create the worktree: `git worktree add <path> -b <branch>` (or `-B` only when intentionally resetting — requires explicit authorization).
4. Bootstrap Engineering OS context in that worktree: `node scripts/engineering-os.mjs start-task --target <path> --title "..." --owner "..." --acceptance "..." --branch <branch> --commit <sha>`.
5. Confine all edits to the worktree path; never copy uncommitted changes across worktrees manually — commit or stash at the boundary.
6. On completion, either merge via PR from `<branch>` or hand off: `node scripts/engineering-os.mjs handoff --target <path> --task <id> ...` with the worktree path noted in `next-action`.
7. After merge or abandon, remove the worktree: `git worktree remove <path>` and prune: `git worktree prune`; confirm `git worktree list` is clean.

## Exit criteria

- Worktree path, branch ownership, and starting commit SHA are recorded on the task.
- No uncommitted cross-worktree file leakage; conflict boundaries documented if merge pending.
- Worktree removed or handoff accepted — cleanup status explicit in task evidence.
- Primary checkout remains on its intended branch with a understood Git state.
