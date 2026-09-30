# Engineering OS Kit

An offline, project-local engineering workflow kit for Claude Code, Codex, and
other coding agents. It creates durable task evidence, incident/lesson records,
and exact source-level handoffs without replacing a project's existing tools.

## Quick start — new project

Initialize any Git repository with one command, straight from GitHub (no clone needed):

```sh
cd my-project            # must already be a Git repo (git init)
npx --yes github:shreenidhims/engineering-os-kit init-project --target .
```

Or from a local clone of this kit:

```sh
node /path/to/engineering-os-kit/src/cli.mjs init-project --target /path/to/new-project
```

This installs the full harness:

| Installed | Purpose |
|-----------|---------|
| `.engineering-os/` | record store, memory files, vendored CLI, policies, hooks |
| `scripts/engineering-os.mjs` / `.ps1` | project-local launcher |
| `AGENTS.md` (managed section) | tool-neutral agent contract |
| `CLAUDE.md` (managed section) | imports `AGENTS.md`, `AGENT_AMPLIFIER.md`, lessons into Claude Code |
| `.claude/settings.json` (merged) | SessionStart briefing + PreToolUse gate that blocks edits until a task is active |
| `.claude/agents`, `.claude/skills`, `.claude/commands/engineering-os` | 37 agents, 17 skills, slash commands |
| `.github/workflows/engineering-os.yml` | CI record validation |
| `.gitignore` (managed section) | ignores lock/temp files |

Existing files are never replaced; managed sections are appended once. Use
`--adapter none` for tool-neutral setup only. Set `ENGINEERING_OS_ENFORCE=0` to
disable the edit gate for a session.

To upgrade an installed project to a newer kit (refreshes kit-owned files only;
records and your own agents/skills are kept):

```sh
npx --yes github:shreenidhims/engineering-os-kit upgrade --target .
```

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
