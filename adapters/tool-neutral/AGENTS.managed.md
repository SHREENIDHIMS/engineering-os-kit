<!-- engineering-os:managed:start -->
## Engineering OS

Run all commands via `node scripts/engineering-os.mjs <command>` from this project
root (auto-targets this repo).

- Before pickup, read `.engineering-os/LESSONS_LEARNED.md`; resume with `show-task`,
  or `accept-handoff` after a handoff. Start new work with `start-task`.
- Every reported change and finding uses repository-relative `path:line` locations
  and command evidence (`record-evidence`).
- For a qualifying failure, run `record-incident` (incident plus linked lesson). Do not
  close the task until `enforce-lesson` names an enforceable prevention mechanism and
  its validation evidence.
- Before another agent takes ownership, create a `handoff`; the next owner runs
  `accept-handoff`.
- Close work only with `verify-task`. Free a task whose owner is gone only with
  `release-task --reason`, after confirming with the user.
- If anything seems misconfigured, run `doctor`.
- Never write Engineering OS state outside the project Git root.
<!-- engineering-os:managed:end -->
