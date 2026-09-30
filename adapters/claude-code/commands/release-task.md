# /engineering-os:release-task

Release a task whose owner is gone (crashed agent, closed session, abandoned
work) so that a new task can start. This is the only supported way to clear a
stale lock — never edit task JSON by hand.

```sh
node scripts/engineering-os.mjs release-task --task <TASK-id> --owner <you> --reason "why it is being released"
```

- Works on `active`, `blocked` or `handoff` tasks; refuses `complete` and `abandoned`.
- Sets the task to `abandoned` and records `releasedBy`, `releaseReason`, `releasedAt`.
- Writes an evidence record (`EVD-*`) naming the previous owner and how long the
  task was idle, and links it to the task, so the release is auditable.
- Always confirm with the user before releasing a task you do not own.

Tasks are flagged as stale by the SessionStart briefing and by `pre-task-check`
after `staleTaskHours` (default 24) without an update. Change the threshold in
`.engineering-os/config.json`.
