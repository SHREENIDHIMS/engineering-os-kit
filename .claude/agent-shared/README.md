# Agent authoring templates

These files are **not agents**. They live outside `.claude/agents/` so Claude Code
never tries to load them as subagents.

| File | Purpose |
|------|---------|
| `_BASE.md` | The "Engineering OS (mandatory)" block pasted at the end of every agent in `.claude/agents/`. |
| `_SHARED.md` | Universal pickup, implementation, verification and stop rules every agent follows. |
| `_SHARED_SNIPPET.md` | One-paragraph pointer to `_SHARED.md` for agents that need it. |

When you add a new agent, start from an existing agent file, keep its YAML
front matter (`name`, `description`), and paste `_BASE.md` at the end with the
`--owner` value set to the new agent's name.
