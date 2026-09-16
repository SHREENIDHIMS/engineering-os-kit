# Closure rules

A task may be marked complete only when `verify-task` passes. Manual status edits to `complete` are rejected.

## Required for closure

| Requirement | Validated by |
|-------------|--------------|
| Title and owner | task schema |
| At least one acceptance criterion | start-task + verify-task |
| At least one evidence record | verify-task |
| At least one `path:line` in changedLocations | verify-task |
| Every linked incident has an enforced lesson | verify-task |
| Lesson has prevention location + validation evidence | enforce-lesson + verify-task |
| All locations resolve inside Git root | check-project-safety |

## Incident closure chain

1. `record-incident` creates INC + draft LES; syncs MISTAKES.md.
2. Implement prevention (test, CI gate, static check, etc.).
3. `record-evidence` for the validation run.
4. `enforce-lesson` marks LES enforced; syncs LESSONS_LEARNED.md.
5. `verify-task` confirms the chain before task completion.

## Handoff rule

When status is `handoff`, no new `start-task` until `accept-handoff` reactivates the task.

## Decision records

Use `record-decision` for architecture or scope choices that outlive a single task. Link to `taskId` when applicable.
