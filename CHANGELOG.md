# Changelog

All notable changes to this kit. Versions follow [semantic versioning](https://semver.org/);
each version is published as a GitHub release from a `v<version>` tag. Pin one with
`npx --yes github:shreenidhims/engineering-os-kit#v<version> <command>`.

## 0.2.0 — 2026-09-30

Upgrade existing projects with `upgrade --target .` and the global install by re-running
`install-global`.

### Added
- No-AI-attribution rule, enforced in layers: rule text for every agent, Claude Code
  `attribution` settings turned off (project and global), a PreToolUse hook that blocks
  attributed `git`/`gh` commands and GitHub tool calls, a git `commit-msg` hook that rejects
  attributed messages and AI identities, `check-attribution` in CI (commits plus PR title and
  body), and `doctor` checks. See `docs/no-ai-attribution.md`.
- `install-global` / `uninstall-global`: machine-wide Claude Code install into `~/.claude` with
  SessionStart guidance or `--auto-init` setup in any Git repo, an edit gate for set-up repos,
  `--replace` (moves old agents/skills/commands to a backup) and `--dry-run`.
- `doctor`: read-only health check of the environment, global install and project, with a fix
  command for every problem; exits 1 on failures.
- `release-task` and stale-task warnings (`staleTaskHours`, default 24) in the session briefing,
  `pre-task-check`, `start-task` and `doctor`.
- `init-project --replace` backs up an existing project `.claude` harness to
  `.engineering-os/backups/`.
- Claude Code hook wiring in `.claude/settings.json`, a managed `CLAUDE.md` section, a managed
  `.gitignore` section, `.claude/ROLE_PROTOCOLS.md` and `.claude/agent-shared/` in projects.
- `upgrade` command; it now also refreshes the managed `AGENTS.md`, `CLAUDE.md` and `.gitignore`
  sections and removes outdated files.
- `npx github:shreenidhims/engineering-os-kit` support (`bin` entry), MIT license, CI on
  Linux/macOS/Windows with Node 20 and 22, install smoke tests, and tagged releases.

### Changed
- `installedFrom` records `engineering-os-kit@<version> (<commit>)` instead of a machine path.
- Agent authoring templates moved from `.claude/agents/` to `.claude/agent-shared/`.
- The CLI is split into `src/commands/` modules; `help` lists every command with a description.
- Files are checked out with LF line endings on every platform (`.gitattributes`).

### Fixed
- Re-running `init-project` never upgraded anything although the docs said it did.
- The kit's own CI workflow was in `ci/` and never ran.
- Self-copy guards now compare real paths, so Windows short names cannot bypass them.

## 0.1.0 — 2026-09-16

Initial kit: portable CLI lifecycle, project-local vendoring, task/incident/lesson/handoff/
decision records, 37 agents, 17 skills, and the target CI workflow.
