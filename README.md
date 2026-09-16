# Engineering OS Kit

An offline, project-local engineering workflow kit for Claude Code, Codex, and
other coding agents. It creates durable task evidence, incident/lesson records,
and exact source-level handoffs without replacing a project's existing tools.

## Quick start — new project

Initialize any Git repository with one command:

```powershell
node src/cli.mjs init-project --target C:\path\to\new-project
```

This installs `.engineering-os/`, project memory files, the `AGENTS.md`
contract, and the Claude adapter (`.claude/agents`, `.claude/skills`, commands).
Use `--adapter none` for tool-neutral setup only.

Or inspect first with a dry-run:

```powershell
node src/cli.mjs bootstrap --target C:\path\to\new-project
node src/cli.mjs bootstrap --target C:\path\to\new-project --apply
```

The target must be inside its own Git repository. Bootstrap creates the
`.engineering-os/` record store, project memory files (`INDEX.md`,
`MISTAKES.md`, `LESSONS_LEARNED.md`), and appends a delimited managed section
to `AGENTS.md`. It never replaces existing instructions and is safe to rerun.

See [installation](docs/installation.md), [GitHub install flow](docs/github-install.md),
[operating model](docs/operating-model.md), and the
[design specification](docs/superpowers/specs/2026-09-16-engineering-os-design.md).

After `init-project`, run all commands from your project root:

```powershell
node scripts/engineering-os.mjs start-task --title "Feature" --owner you --acceptance "done"
```

The launcher auto-targets the project it lives in — paths never stick to your dev machine.

## Local validation

```powershell
npm test
npm run check
```
