# Engineering OS lifecycle

1. **Initialize** — `init-project` vendors the kit, launcher, hooks, and CI into the target Git repo.
2. **Pre-task** — `pre-task-check` confirms initialization, active task, and record integrity.
3. **Start** — `start-task` creates ownership, acceptance criteria, and an active lock.
4. **Work** — agents edit code; every change cites `path:line`; evidence via `record-evidence`.
5. **Decide** — durable architecture choices via `record-decision` when trade-offs matter.
6. **Fail** — qualifying failures via `record-incident` (linked lesson draft + MISTAKES.md sync).
7. **Prevent** — `enforce-lesson` with real prevention at `path:line` + validation evidence.
8. **Transfer** — `handoff` then `accept-handoff`; next agent runs `show-task` or `show-handoff`.
9. **Close** — `verify-task` only; sets status `complete` when evidence, locations, and lessons pass.
   **Release** — a task whose owner is gone (flagged stale after `staleTaskHours`, default 24) is freed only with `release-task --reason`, which sets `abandoned` and records evidence. Confirm with the user before releasing a task you do not own.
10. **Audit** — `check-project-safety` and CI workflow validate records on every push.

All commands from the project root:

```powershell
node scripts/engineering-os.mjs <command>
```

The launcher injects `--target` for the current Git repository automatically.
