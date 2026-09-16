---
name: session-handoff
description: Focused workflow for session handoff.
---

# session-handoff

## When to use

Use when **stopping mid-task** or transferring ownership so the next agent can resume without re-discovering state.

## Procedure

1. Pull the live task briefing: `node scripts/engineering-os.mjs show-task --target . --task <id>` — note owner, acceptance criteria, incidents, and enforced lessons.
2. Capture Git facts: branch name, `HEAD` SHA, staged vs unstaged files, and whether a push occurred (`git status --short --branch`, `git log -1 --oneline`).
3. List completed work vs remaining work; for each completed item cite repository-relative `path:line` locations actually touched.
4. Attach verification proof already gathered — collect evidence IDs from the task and note any commands the next owner must re-run.
5. Write the handoff record with all required fields: `node scripts/engineering-os.mjs handoff --target . --task <id> --from "<role>" --to "<role>" --locations "path:line|..." --next-action "<first command>" --evidence "EVD-..."`.
6. Confirm task status flipped to `handoff` in `.engineering-os/INDEX.md`; do not start new edits after handoff.
7. Instruct the receiver to run `node scripts/engineering-os.mjs accept-handoff --target . --handoff <id> --owner "<role>"` then `show-task` before any edit.

## Exit criteria

- Handoff JSON validates (task ID, from/to owners, locations inside Git root, next action present).
- Task status is `handoff`; no parallel active task exists.
- Git state, evidence IDs, incident/lesson links, risks, and decisions are documented — none omitted.
- Next owner can execute `next-action` without reading chat history.
