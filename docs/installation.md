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

## Existing projects

`init-project` works the same on an existing repository: it only adds what is
missing and appends managed sections to `AGENTS.md`, `CLAUDE.md` and
`.gitignore`. If the project already has its own Claude harness and you want the
kit's to replace it, add `--replace`:

```sh
node /path/to/engineering-os-kit/src/cli.mjs init-project --target . --replace
```

This moves `.claude/agents`, `.claude/skills` and `.claude/commands` to
`.engineering-os/backups/claude-<timestamp>/` (git-ignored) before installing.
`.claude/settings.json` is merged, and `settings.local.json` and any other file
in `.claude/` stay untouched. Delete the backup once you have checked nothing in
it is still needed.

## Global install

To make every Claude Code session on your machine aware of Engineering OS, run
`install-global` once. See [global install](global-install.md).

After install, always use the **project-local launcher** (paths auto-stick to that project):

```powershell
cd C:\projects\my-project
node scripts/engineering-os.mjs start-task --title "Feature" --owner you --acceptance "done"
```

See [GitHub install flow](github-install.md) for pushing the kit to GitHub and installing on any machine.

## Claude Code adapter

`init-project` installs the adapter automatically (default `--adapter claude`):

- `.claude/agents/`, `.claude/skills/`, `.claude/commands/engineering-os/`
- `.claude/ROLE_PROTOCOLS.md` (role evidence rules) and `.claude/agent-shared/` (agent authoring templates, kept out of `.claude/agents/` so Claude Code does not load them as agents)
- `.claude/settings.json` — merged (never replaced) with two hooks:
  - `SessionStart` → `.engineering-os/hooks/claude-session-start.mjs` prints the active task, pending handoffs, open incidents and enforced lessons into context.
  - `PreToolUse` on `Edit|Write|MultiEdit|NotebookEdit` → `.engineering-os/hooks/claude-pre-edit.mjs` blocks edits (exit 2) until `pre-task-check` passes. Disable per session with `ENGINEERING_OS_ENFORCE=0`.
  - Both step aside when the global hooks from `install-global` are present on the machine, so nothing runs twice.
- `CLAUDE.md` — a managed section that imports `AGENTS.md`, `AGENT_AMPLIFIER.md`, and `.engineering-os/LESSONS_LEARNED.md`, because Claude Code reads `CLAUDE.md`, not `AGENTS.md`.

The adapter is an instruction layer; all durable state remains in `.engineering-os`.

## Checking the install

Run `node scripts/engineering-os.mjs doctor` after installing or upgrading. It
verifies the record store, launcher, vendored kit, record validity, hooks and
managed sections, and prints a fix command for each problem.

## Upgrading

Run `upgrade` from a newer kit clone (or via `npx github:...`). It overwrites
kit-owned files — vendored CLI, schemas, policies, hooks, launcher, target CI,
and the kit's agents/skills/commands — refreshes the managed sections in
`.gitignore` and `CLAUDE.md`, removes files older versions put in the wrong
place, and leaves task/incident/lesson/handoff records and any agents or skills
you added yourself. It refuses to run from the
vendored copy inside the project.

```sh
node /path/to/newer-kit/src/cli.mjs upgrade --target .
```

## Safety

Commands use `git -C <target> rev-parse --show-toplevel` and reject source
locations that leave that root. They do not install packages, call the network,
change remotes, or perform database operations. (Running via `npx github:...`
downloads the kit itself; the kit then runs offline.)
