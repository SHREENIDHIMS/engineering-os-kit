# Engineering OS Kit

An offline, project-local engineering workflow kit for Claude Code, Codex, and
other coding agents. It creates durable task evidence, incident/lesson records,
and exact source-level handoffs without replacing a project's existing tools.

Requirements: Node.js 20+, Git. No runtime dependencies. Tested on Linux, macOS and Windows.
Licensed under [MIT](LICENSE). See the [changelog](CHANGELOG.md).

**No AI attribution.** Every install enforces one rule: nothing in Git history
or on GitHub (commits, author identity, tags, merges, PRs, comments, releases)
may credit or mention an AI tool, agent or provider. It is enforced by rule
text, Claude Code settings, a Claude hook, a git `commit-msg` hook, CI and
`doctor` — see [no AI attribution](docs/no-ai-attribution.md).

There are two ways to install it, and they work together:

| Mode | Command | What you get |
|------|---------|--------------|
| **Global** (once per machine) | `install-global` | Every Claude Code session on the machine has the agents, skills and `/engineering-os:*` commands. In any Git repo, Claude is told whether Engineering OS is set up and how to set it up (or it is set up automatically with `--auto-init`). |
| **Per project** | `init-project` | The project carries its own copy of everything (records, CLI, hooks, agents, CI), so it works for teammates and CI that never ran the global install. |

## 1. Global install — set up Claude Code once

```sh
npx --yes github:shreenidhims/engineering-os-kit install-global
```

Or from a local clone: `node /path/to/engineering-os-kit/src/cli.mjs install-global`.

Useful flags:

| Flag | Effect |
|------|--------|
| `--dry-run` | Show what would change; write nothing. |
| `--replace` | Move your existing `~/.claude/agents`, `skills` and `commands` into `~/.claude/engineering-os-backups/<timestamp>/` first, so only this harness is active. Nothing is deleted. |
| `--auto-init` | At session start, set up Engineering OS automatically in any Git repo that does not have it yet. Without it, Claude tells you and asks first. |
| `--claude-dir <dir>` | Use another Claude Code config dir (default: `$CLAUDE_CONFIG_DIR` or `~/.claude`). |

`install-global` never touches your login, history, sessions, projects, plugins
or other settings: it merges two hooks into `settings.json` and appends one
managed section to `CLAUDE.md`. Remove everything it added with
`uninstall-global`. Opt a single repo out by creating an empty
`.engineering-os-ignore` file in it. Full details: [global install](docs/global-install.md).

## 2. Per-project install — new or existing repository

```sh
cd my-project            # must already be a Git repo (git init)
npx --yes github:shreenidhims/engineering-os-kit init-project --target .
```

After a global install you can also run it offline from the global kit copy:
`node ~/.claude/engineering-os/kit/src/cli.mjs init-project --target .`
(the SessionStart briefing prints the exact path).

This installs the full harness:

| Installed | Purpose |
|-----------|---------|
| `.engineering-os/` | record store, memory files, vendored CLI, policies, hooks |
| `scripts/engineering-os.mjs` / `.ps1` | project-local launcher |
| `AGENTS.md` (managed section) | tool-neutral agent contract |
| `CLAUDE.md` (managed section) | imports `AGENTS.md`, `AGENT_AMPLIFIER.md`, lessons into Claude Code |
| `.claude/settings.json` (merged) | SessionStart briefing + PreToolUse gate that blocks edits until a task is active |
| `.claude/agents`, `.claude/skills`, `.claude/commands/engineering-os` | 37 agents, 17 skills, slash commands |
| `.claude/agent-shared/`, `.claude/ROLE_PROTOCOLS.md` | agent authoring templates and role evidence rules |
| `.github/workflows/engineering-os.yml` | CI record validation |
| `.gitignore` (managed section) | ignores lock, temp and backup files |
| `.git/hooks/commit-msg` (this clone) | rejects AI attribution and AI author identities in commits |

Existing files are never replaced; managed sections are appended once. Options:

- `--replace` — the project already has its own `.claude/agents`, `skills` or
  `commands`: move them to `.engineering-os/backups/claude-<timestamp>/`
  (git-ignored) and install the kit's. `settings.json`, `settings.local.json`
  and anything else in `.claude/` stay in place.
- `--adapter none` — tool-neutral setup only (no `.claude/` files).
- `ENGINEERING_OS_ENFORCE=0` — disable the edit gate for one session.

Inspect first with a dry-run:

```sh
node /path/to/engineering-os-kit/src/cli.mjs bootstrap --target .            # plan only
node /path/to/engineering-os-kit/src/cli.mjs bootstrap --target . --apply    # apply
```

## Daily use

Run every command from the project root through the launcher, which targets
the project it lives in:

```sh
node scripts/engineering-os.mjs start-task --title "Feature" --owner you --acceptance "done"
node scripts/engineering-os.mjs record-evidence --command "npm test" --exit-code 0 --summary "tests pass" --owner you
node scripts/engineering-os.mjs update-task --task TASK-... --locations "src/app.js:12" --evidence EVD-...
node scripts/engineering-os.mjs verify-task --task TASK-...
node scripts/engineering-os.mjs check-attribution --range main..HEAD    # before pushing
```

A task left active by a crashed or closed session is flagged as stale after 24
hours (`staleTaskHours` in `.engineering-os/config.json`). Free it with an
auditable release:

```sh
node scripts/engineering-os.mjs release-task --task TASK-... --owner you --reason "previous session crashed"
```

Run `node scripts/engineering-os.mjs help` for all commands and see the
[record reference](docs/record-reference.md).

## Checking an install

`doctor` is a read-only health check of Node/Git, the global install and the
current project. Every problem it finds comes with the exact command that fixes it:

```sh
node scripts/engineering-os.mjs doctor                  # in a set-up project
node ~/.claude/engineering-os/kit/src/cli.mjs doctor    # anywhere, after install-global
```

It exits with code 1 only on real failures, so CI can run it.

## Upgrading

`init-project` never overwrites, so it does not upgrade. Use `upgrade`, which
refreshes kit-owned files (vendored CLI, schemas, policies, hooks, launcher, CI,
the kit's agents/skills/commands, managed sections) and keeps your records and
any agents or skills you added:

```sh
npx --yes github:shreenidhims/engineering-os-kit upgrade --target .          # a project
npx --yes github:shreenidhims/engineering-os-kit install-global              # the global install
```

When the global kit is newer than a project's, the session briefing suggests the upgrade.

### Pinning a version

`github:shreenidhims/engineering-os-kit` always means the latest `main`. To use a
released version instead, add its tag (see [releases](https://github.com/shreenidhims/engineering-os-kit/releases)
and the [changelog](CHANGELOG.md)):

```sh
npx --yes github:shreenidhims/engineering-os-kit#v0.2.0 init-project --target .
```

## Documentation

- [Installation](docs/installation.md) and [GitHub install flow](docs/github-install.md)
- [Global install](docs/global-install.md)
- [No AI attribution](docs/no-ai-attribution.md)
- [Operating model](docs/operating-model.md) and [lifecycle policy](core/policies/lifecycle.md)
- [Design specification](docs/superpowers/specs/2026-09-16-engineering-os-design.md)
- [Capability audit](docs/audit.md)

## Local validation

```sh
npm test
npm run check
```
