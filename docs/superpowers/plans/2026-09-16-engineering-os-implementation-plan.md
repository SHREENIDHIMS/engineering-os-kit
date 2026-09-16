# Engineering OS Kit — Implementation Plan

## Constraints

- The current directory is not its own Git root. Do not commit or run broad Git
  operations here; all kit commands must require an explicit target project.
- Build with Node.js standard library only, with PowerShell launchers.
- Tests use temporary fixture repositories outside user projects.
- All writes are project-local, idempotent, and default to dry-run for bootstrap.

## Slice 1 — Core contracts and validator

### New files

- `package.json`: Node scripts for test, lint-free validation, and CLI entry.
- `core/schemas/*.schema.json`: JSON Schema documents for task, incident, lesson,
  handoff, decision, evidence, config, and state records.
- `core/templates/*.md`: readable templates with required fields and examples.
- `src/core/ids.mjs`: stable ID generation and parsing.
- `src/core/project-root.mjs`: Git root resolution and project-relative path
  validation.
- `src/core/records.mjs`: read/write atomically, JSON validation, cross-record
  link checks, and safe Markdown rendering.
- `src/core/validate.mjs`: task closure, lesson enforcement, handoff, and safety
  validators.
- `test/core/*.test.mjs`: unit tests for IDs, paths, records, and validation.

### Acceptance checks

- Reject locations outside the selected Git root.
- Reject task completion without mandatory evidence.
- Reject incident closure without a linked valid lesson.
- Reject lessons lacking a prevention location and validation evidence.

## Slice 2 — Lifecycle CLI

### New files

- `src/cli.mjs`: command dispatcher and safe error formatting.
- `src/commands/bootstrap.mjs`: inspect/dry-run/create-missing core structure.
- `src/commands/start-task.mjs`: task ID, lock, baseline Git metadata.
- `src/commands/record-incident.mjs`: incident and lesson draft pair.
- `src/commands/handoff-task.mjs`: transferable task status record.
- `src/commands/verify-task.mjs`: evidence and relation validation report.
- `src/commands/check-project-safety.mjs`: Git-root and state scan.
- `scripts/engineering-os.ps1`: PowerShell launcher.
- `test/commands/*.test.mjs`: fixture-driven command behavior tests.

### Acceptance checks

- Bootstrap changes no existing file by default and is idempotent.
- A competing task lock fails clearly.
- Handoff and task verification point to concrete, project-local locations.

## Slice 3 — Portable adapter and documentation

### New files

- `adapters/tool-neutral/AGENTS.managed.md`: managed contract inserted into
  target `AGENTS.md`.
- `docs/installation.md`, `docs/operating-model.md`, and
  `docs/record-reference.md`: installation, lifecycle, schemas, and examples.
- `README.md`, `.gitignore`, `CONTRIBUTING.md`: repository hygiene.
- `ci/engineering-os.yml`: CI template using the CLI safety/record validators.

### Acceptance checks

- Installation instructions can bootstrap a fixture project.
- Tool-neutral instructions name the same `.engineering-os` records and CLI.

## Slice 4 — Claude Code adapter

### Modified/new files

- `.claude/agents/*.md`: replace the 40 generic role prompts with specialized
  mission-specific procedures and evidence requirements.
- `.claude/skills/*/SKILL.md`: replace generic skills with focused workflows.
- `adapters/claude-code/commands/*.md`: task lifecycle commands.
- `adapters/claude-code/hooks/*`: non-destructive validation hook templates.
- `docs/claude-code-adapter.md`: safe installation and operation instructions.

### Acceptance checks

- Agents define unique specialization, required artifacts, verification, and
  stop conditions.
- Every Claude command calls the portable process rather than maintaining a
  separate record format.

## Slice 5 — CI, fixtures, and final audit

### New files

- `test/fixtures/`: representative Git project fixtures.
- `test/e2e/*.test.mjs`: bootstrap, task, incident/lesson, handoff, safety, and
  adapter integration tests.
- `docs/audit.md`: completed capability matrix and evidence.

### Acceptance checks

- `npm test` passes all fixture tests.
- The CI template is syntactically valid and invokes only safe local commands.
- A final scan proves every role/skill differs materially from generic template
  behavior and no record operation escapes a target project Git root.

## Execution order

Implement and test slices in order. Stop after each slice if a safety invariant
or record model assumption is contradicted. Do not add network dependencies or
production integrations.
