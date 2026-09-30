# /engineering-os:init-project

Initialize a new or existing Git project with `.engineering-os/`, project memory
files, the `AGENTS.md` and `CLAUDE.md` managed sections, Claude Code hooks, and
the Claude adapter (agents, skills, commands). Equivalent to
`bootstrap --apply --adapter claude`.

Run from the repository root with whichever kit copy is available:

```sh
node ~/.claude/engineering-os/kit/src/cli.mjs init-project --target .        # global install
npx --yes github:shreenidhims/engineering-os-kit init-project --target .     # from GitHub
```

- Tell the user before running it; it adds files they will want to review and commit.
- Add `--replace` only if the user wants the project's existing `.claude/agents`,
  `skills` and `commands` replaced; they are moved to `.engineering-os/backups/`.
- Never run it in a repository containing `.engineering-os-ignore`.
- Afterwards, start a task with `node scripts/engineering-os.mjs start-task ...`.
