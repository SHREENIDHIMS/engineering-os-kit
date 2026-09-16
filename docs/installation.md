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

Copy the adapter's agents, skills, commands, and non-destructive hooks only
after the target project has been bootstrapped and reviewed. The adapter is an
instruction layer; all durable state remains in `.engineering-os`.

## Safety

Commands use `git -C <target> rev-parse --show-toplevel` and reject source
locations that leave that root. They do not install packages, call the network,
change remotes, or perform database operations.
