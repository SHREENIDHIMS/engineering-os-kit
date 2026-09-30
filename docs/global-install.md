# Global install (every Claude Code session on a machine)

`install-global` sets Engineering OS up once in your user-level Claude Code
configuration, so every Claude Code session — terminal, desktop or IDE — has
the harness and knows how to set it up in any project you open.

It complements, and does not replace, the per-project install: a project still
needs `init-project` so its records, CLI copy, hooks and CI live in the repo
for teammates and CI machines.

## Install

```sh
npx --yes github:shreenidhims/engineering-os-kit install-global --dry-run   # preview
npx --yes github:shreenidhims/engineering-os-kit install-global             # apply
```

From a local clone: `node /path/to/engineering-os-kit/src/cli.mjs install-global`.

| Flag | Effect |
|------|--------|
| `--dry-run` | Print the plan; write nothing. |
| `--replace` | Before installing, move `agents/`, `skills/` and `commands/` from your Claude config dir into `engineering-os-backups/<timestamp>/`, so only this harness is active. |
| `--auto-init` | Set up Engineering OS automatically at session start in any Git repo that lacks it. Stays on for later installs until you edit `engineering-os/config.json`. |
| `--claude-dir <dir>` | Target another config dir. Default: `$CLAUDE_CONFIG_DIR`, else `~/.claude`. |

Re-running `install-global` is safe: it refreshes the kit and hooks in place
and never duplicates hook entries or the `CLAUDE.md` section. Use it to upgrade.

## What changes in `~/.claude`

| Path | Change |
|------|--------|
| `engineering-os/kit/` | Full offline copy of the kit (CLI, schemas, policies, hooks, agents, skills, CI template). Replaced on every install. `init-project` and `upgrade` can run from here with no network. |
| `engineering-os/hooks/` | The two global hooks below. Replaced on every install. |
| `engineering-os/config.json` | `version`, `installedFrom` (`engineering-os-kit@<version> (<commit>)`), `installedAt`, `autoInit`. |
| `engineering-os/installed-files.json` | Manifest of the agent, skill and command files copied in; `uninstall-global` removes exactly these. |
| `agents/`, `skills/`, `commands/engineering-os/` | Kit files copied in. Files you added yourself are kept; a file with the same name as a kit file is overwritten (use `--replace` to back those up first). |
| `settings.json` | Two hook entries appended (`SessionStart`, `PreToolUse`). Every other setting and hook is kept. Aborts without changing anything if the file is not valid JSON. |
| `CLAUDE.md` | One section between `<!-- engineering-os:global:start -->` and `<!-- engineering-os:global:end -->`; your own text is kept. |

**Never touched:** credentials, history, `sessions/`, `projects/`, `plugins/`,
and any other file. `--replace` moves folders into a backup rather than deleting
them — the Claude config dir also holds your login and history, so deleting it
wholesale would sign you out and lose them.

## How the global hooks behave

The hook commands use absolute paths with forward slashes, so they work in
macOS/Linux shells and in Git Bash on Windows.

**SessionStart** (`global-session-start.mjs`) — output is added to Claude's context.

| Situation | What Claude sees |
|-----------|------------------|
| Not inside a Git repository | Nothing. |
| Repo has `.engineering-os-ignore`, or is the kit's own repo | Nothing. |
| Repo not set up, `autoInit` off (default) | Instructions to tell you and run `init-project --target .` with the exact path of the global kit. |
| Repo not set up, `autoInit` on | `init-project` runs immediately; Claude is told to let you know and to suggest reviewing and committing the new files. |
| Repo set up | The project briefing: active task, pending handoff, stale-task warning, open incidents, enforced lessons. |
| Repo set up with an older kit version | Also a suggestion to run `upgrade --target .` after asking you. |

The repository root is found with `git rev-parse --show-toplevel`, so opening
Claude Code in a subfolder works.

**PreToolUse** on `Edit|Write|MultiEdit|NotebookEdit` (`global-pre-edit.mjs`):

- In a set-up repo, runs `pre-task-check`; if it fails (no active task, pending
  handoff, invalid records) the edit is blocked with exit code 2 and Claude sees why.
- Repos that are not set up, opted-out repos and non-Git folders are never blocked.
- `ENGINEERING_OS_ENFORCE=0` disables the gate for a session.

**No double runs.** A project set up with `init-project` has its own copies of
these hooks in `.claude/settings.json` (for teammates without the global
install). When the global hooks are installed on the machine, the project copies
detect that and do nothing, so the briefing and the gate run once. Projects set
up with a kit older than this change may show the briefing twice until they run
`upgrade`.

## Opting a repository out

```sh
touch .engineering-os-ignore    # at the repo root; commit it if the whole team wants this
```

## Uninstall

```sh
npx --yes github:shreenidhims/engineering-os-kit uninstall-global --dry-run
npx --yes github:shreenidhims/engineering-os-kit uninstall-global
```

Removes the files listed in the manifest, the two hook entries, the managed
`CLAUDE.md` section and `engineering-os/`, then removes any folders left empty.
Your own agents, skills, settings and text stay. Backups made by `--replace`
are kept in `engineering-os-backups/`; restore by moving a folder back, e.g.
`mv ~/.claude/engineering-os-backups/<timestamp>/agents ~/.claude/agents`.

Projects that were set up keep working after uninstall: they carry their own copy.

## Troubleshooting

Start with `node ~/.claude/engineering-os/kit/src/cli.mjs doctor`: it checks the global
kit, hook files and `settings.json` entries and prints the fix for anything missing.

| Symptom | Fix |
|---------|-----|
| `settings.json is not valid JSON` | Fix the JSON (or move the file away) and re-run; nothing was changed. |
| No briefing appears | Check you are inside a Git repo, there is no `.engineering-os-ignore`, and `~/.claude/settings.json` contains `engineering-os/hooks/global-`. Run the hook by hand: `node ~/.claude/engineering-os/hooks/global-session-start.mjs`. |
| Every edit is blocked | Start a task (`node scripts/engineering-os.mjs start-task ...`), accept a pending handoff, or release a stale task with `release-task`. |
| `node` not found in hooks | Claude Code runs hooks with your shell's `PATH`; make sure Node.js 20+ is on it. |
