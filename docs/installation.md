# Installation

## Prerequisites

- Node.js 20 or newer
- Git
- A target project that is already inside its own Git repository

## Tool-neutral installation

For a **new project**, initialize everything in one step:

```powershell
node src/cli.mjs init-project --target C:\projects\my-project
```

By default this also installs the Claude adapter (`.claude/agents`, `.claude/skills`,
commands) and writes `.engineering-os/config.json` with the kit path. For
tool-neutral setup only:

```powershell
node src/cli.mjs init-project --target C:\projects\my-project --adapter none
```

Or dry-run first, then apply:

```powershell
node src/cli.mjs bootstrap --target C:\projects\my-project
node src/cli.mjs bootstrap --target C:\projects\my-project --apply
```

Bootstrap creates:

- `.engineering-os/{tasks,incidents,lessons,handoffs,decisions,evidence,state}/`
- `.engineering-os/INDEX.md`, `MISTAKES.md`, `LESSONS_LEARNED.md`
- `.engineering-os/state/project.json`
- An explicitly delimited Engineering OS section in `AGENTS.md`

Reruns are idempotent and never overwrite existing project files.

After install, always use the **project-local launcher** (paths auto-stick to that project):

```powershell
cd C:\projects\my-project
node scripts/engineering-os.mjs start-task --title "Feature" --owner you --acceptance "done"
```

See [GitHub install flow](github-install.md) for pushing the kit to GitHub and installing on any machine.

## Claude Code adapter

`init-project` installs the adapter automatically (default `--adapter claude`):

- `.claude/agents/`, `.claude/skills/`, `.claude/ROLE_PROTOCOLS.md`, `.claude/commands/engineering-os/`
- `.claude/settings.json` — merged (never replaced) with two hooks:
  - `SessionStart` → `.engineering-os/hooks/claude-session-start.mjs` prints the active task, pending handoffs, open incidents and enforced lessons into context.
  - `PreToolUse` on `Edit|Write|MultiEdit|NotebookEdit` → `.engineering-os/hooks/claude-pre-edit.mjs` blocks edits (exit 2) until `pre-task-check` passes. Disable per session with `ENGINEERING_OS_ENFORCE=0`.
- `CLAUDE.md` — a managed section that imports `AGENTS.md`, `AGENT_AMPLIFIER.md`, and `.engineering-os/LESSONS_LEARNED.md`, because Claude Code reads `CLAUDE.md`, not `AGENTS.md`.

The adapter is an instruction layer; all durable state remains in `.engineering-os`.

## Upgrading

Run `upgrade` from a newer kit clone (or via `npx github:...`). It overwrites
kit-owned files — vendored CLI, schemas, policies, hooks, launcher, target CI,
and the kit's agents/skills/commands — and leaves task/incident/lesson/handoff
records and any agents or skills you added yourself. It refuses to run from the
vendored copy inside the project.

```sh
node /path/to/newer-kit/src/cli.mjs upgrade --target .
```

## Safety

Commands use `git -C <target> rev-parse --show-toplevel` and reject source
locations that leave that root. They do not install packages, call the network,
change remotes, or perform database operations. (Running via `npx github:...`
downloads the kit itself; the kit then runs offline.)
