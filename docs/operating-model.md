# Operating model

1. Run `start-task` before an agent edits code. Include title, owner, and
   acceptance criteria.
2. Record command outcomes with `record-evidence` and add source locations as
   repository-relative `path:line` values.
3. For a confirmed bug, failed feature, data/database issue, security issue,
   release failure, or agent mistake, run `record-incident`. It creates the
   linked incident and lesson draft together.
4. Implement and validate an actual prevention mechanism, then run
   `enforce-lesson`. A lesson is only enforceable after it has a prevention
   type, source location, and evidence.
5. Use `handoff` before a different agent takes over. The handoff identifies
   prior and next owners, changed source locations, and the next action.
6. The next owner runs `accept-handoff`, then `show-task` for the full briefing.
7. Run `verify-task` before marking the work complete. It refuses missing
   evidence, missing source locations, and unresolved incident lessons.
8. `MISTAKES.md`, `LESSONS_LEARNED.md`, and `INDEX.md` sync automatically after
   each incident, lesson, handoff, and task change.

## Source references

Use `src/services/payments.js:42`, not absolute paths, editor URLs, or vague
phrases such as “the payment module.” The reference must remain inside the
target project's Git root.

## Closure rule

Completion is an evidence-backed decision, not a claim. At minimum it requires
acceptance criteria, owner, command evidence, valid source locations, and an
enforced lesson for each linked incident.
