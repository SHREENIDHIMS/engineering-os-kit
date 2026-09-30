# Contributing

Keep changes small, offline by default, and safe for unrelated Git projects.
Every new lifecycle invariant needs an observable behavior-level test. Do not
introduce runtime dependencies without a documented dependency and license
review. Run `npm test` and `npm run check` before proposing a change.

## Layout

- `src/cli.mjs` parses arguments and dispatches; commands live in `src/commands/`
  (`setup`, `tasks`, `records`, `handoffs`, `doctor`) and are registered in
  `src/commands/index.mjs`, which also generates `help`.
- `src/core/` holds storage, validation, install and path logic shared by commands.
- `adapters/claude-code/hooks/` are copied into projects; `adapters/claude-code/global-hooks/`
  into `~/.claude/engineering-os/hooks/`.
- The managed `AGENTS.md` text lives in `src/core/agents-contract.mjs`; keep
  `adapters/tool-neutral/AGENTS.managed.md` identical (a test enforces it).

## Releasing

1. Add a `## <version> — <date>` section to `CHANGELOG.md` and bump `version` in `package.json`.
2. Merge to `main` with CI green on all three operating systems.
3. Tag and push: `git tag v<version> && git push origin v<version>`. The release workflow
   checks the tag matches `package.json`, runs the tests and publishes the GitHub release
   with that changelog section as notes.
