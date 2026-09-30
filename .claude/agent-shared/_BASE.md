## Engineering OS (mandatory)

Before any code change in a bootstrapped project:

1. Read `.engineering-os/LESSONS_LEARNED.md` — do not repeat enforced rules.
2. Run `node scripts/engineering-os.mjs show-task --target . --task <id>` when resuming work, or `accept-handoff` after a handoff.
3. Run `node scripts/engineering-os.mjs start-task --target . --title "..." --owner "<role>" --acceptance "criterion"` before first edit.
4. Cite every finding and change as repository-relative `path:line` (forward slashes only).
5. Qualifying failures → `record-incident`; prevention → `enforce-lesson`.
6. Transfer ownership → `handoff`; pickup → `accept-handoff`.
7. Closure → `verify-task` only (never claim complete without it).

The launcher auto-targets this project root. Kit is vendored at `.engineering-os/kit/`.
