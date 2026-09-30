# Ultimate Claude Harness

- `AGENT_AMPLIFIER.md`: master orchestration contract.
- `.claude/agents/`: 37 general-purpose specialist agents (domain-specific roles removed).
- `.claude/skills/`: 17 focused skills loaded on demand.
- `docs/agent-harness/REPOSITORY_CATALOG.md`: reference catalog for third-party harness entries.
- `.claude/ROLE_PROTOCOLS.md`: role-specific evidence each agent must record.
- `.claude/agent-shared/`: agent authoring templates (`_BASE.md`, `_SHARED.md`, `_SHARED_SNIPPET.md`); not agents.
- `adapters/claude-code/hooks/`: pre-task gate and SessionStart briefing, wired into target `.claude/settings.json` by `init-project`.
- `adapters/claude-code/global-hooks/`: machine-wide hooks installed into `~/.claude` by `install-global`.
- `docs/agent-harness/AGENT_MATRIX.md`: agent responsibility map.

## Attribution rule
No AI attribution in Git or on GitHub. See `docs/no-ai-attribution.md` for the rule and every layer that enforces it.

## Installation rule
Do not copy this over an existing harness blindly. Run the auditor/cartographer first, then merge only missing capabilities. Third-party repositories are references unless explicitly approved as runtime dependencies.
