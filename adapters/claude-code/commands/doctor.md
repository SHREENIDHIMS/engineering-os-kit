# /engineering-os:doctor

Read-only health check. Run it when hooks do not fire, edits are blocked
unexpectedly, a command fails, or after upgrading.

```sh
node scripts/engineering-os.mjs doctor                  # inside a set-up project
node ~/.claude/engineering-os/kit/src/cli.mjs doctor    # anywhere, with the global install
```

It checks the environment (Node.js 20+, Git), the global install (kit, hooks,
`settings.json` entries, version) and the project (record store, launcher,
vendored kit, record validity, `path:line` safety, active/stale task, pending
handoff, `AGENTS.md`/`CLAUDE.md`/`.gitignore` sections, Claude hooks, outdated
files, version).

Output is JSON with `healthy`, a `summary` and one entry per check. Each problem
has a `fix` with the exact command to run. `fail` exits with code 1 (so CI can
use it); `warn` means it works but should be improved. Run the suggested fixes
only after telling the user what they change.
