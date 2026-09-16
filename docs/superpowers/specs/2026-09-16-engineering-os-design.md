# Engineering OS Kit — Design Specification

## Status

Approved design; pending implementation-plan review.

## Problem

The current harness names 40 specialist agents and 20 focused skills, but every
agent has the same generic procedure and every skill has the same generic
workflow. It has no executable lifecycle, durable project memory, task ownership
model, incident/lesson system, CI integration, or tool-neutral contract. As a
result, it cannot prove work, prevent repeated failures, or hand work between
agents with source-level precision.

## Goals

1. Provide an installable, project-local Engineering OS that works in Git-based
   repositories without accessing files outside the selected project root.
2. Track every engineering task with ownership, acceptance criteria, exact
   source locations, verification evidence, and a closure decision.
3. Capture qualifying failures as immutable incident records and enforce a
   linked, validated prevention lesson before closure.
4. Make agent handoffs deterministic, with exact `path:line` references and
   already-run command results.
5. Supply a Claude Code adapter and a tool-neutral adapter (including Codex),
   both backed by one canonical record format.
6. Validate record integrity locally and in CI without requiring network access.
7. Upgrade each existing role to a specific, enforceable responsibility.

## Non-goals

- Replacing a project's issue tracker, observability platform, database backup
  solution, secrets manager, or CI provider.
- Automatically judging every code change as a mistake.
- Uploading project metadata, source, or evidence to external services.
- Overwriting existing project configuration or agent instructions.
- Running a destructive database action or production deployment.

## Package structure

```text
ultimate-claude-harness/
  core/
    schemas/                 # JSON Schemas for all durable records
    templates/               # Human-readable Markdown record templates
    policies/                # Tool-neutral lifecycle and closure rules
  adapters/
    claude-code/             # Specialized agents, skills, commands, hooks
    tool-neutral/            # AGENTS.md fragments for Codex/other agents
  scripts/
    bootstrap-engineering-os # Safe, idempotent installer
    start-task               # Creates task + ownership state
    record-incident          # Creates incident + lesson pair
    handoff-task             # Creates validated handoff record
    verify-task              # Validates closure evidence
    check-project-safety     # Validates Git scope and project-local paths
  ci/
    engineering-os.yml       # CI template for record and task validation
  tests/
    fixtures/                # Tiny representative target projects
  docs/
    installation.md
    operating-model.md
    record-reference.md
```

After bootstrap, a target project contains:

```text
project-root/
  .engineering-os/
    tasks/
    incidents/
    lessons/
    handoffs/
    decisions/
    evidence/
    state/
  AGENTS.md
  .claude/                   # Created only if the Claude adapter is selected
```

The core record formats are canonical. Adapters may add instructions but may
not fork schemas or write adapter-specific task state.

## Record model

### Task

`TASK-YYYYMMDD-###` records: requester, owner agent/tool, status, Git branch
and starting commit, scope/non-goals, acceptance criteria, affected interfaces,
changed locations, required checks, command evidence, reviews, incidents, and
closure decision. Changed locations are `relative/path:line` strings and must
resolve within the selected Git root.

### Incident

`INC-YYYYMMDD-###` records only qualifying failures: confirmed bug, failed
feature, database/data defect, security defect, release/production failure, or
explicit agent error. Required fields are severity, task ID, commit, discovery
method, impact, reproduction, containment, root cause, corrected locations,
rollback, regression evidence, and linked lesson ID.

### Lesson

`LES-YYYYMMDD-###` is append-only and links to exactly one initial incident.
It describes the prevention rule, enforcement type, enforcement location,
owner, validation evidence, and status. Valid prevention types are:
`test`, `static-check`, `ci-gate`, `migration-check`, `review-rule`, and
`agent-policy`. A lesson without an enforcement location or validation evidence
cannot be closed. Later corrections create a superseding record; they do not
erase historical evidence.

### Handoff

`HOF-<task-id>-###` includes current owner, next owner, completed work,
remaining work, decisions, risks, changed `path:line` references, current Git
state, command/result evidence, and the next agent's first command. A handoff
is rejected if its locations escape the project root or its task ID is unknown.

### Decision and evidence

Decisions document durable architecture choices and trade-offs. Evidence
records immutable command, timestamp, exit code, and summarized result data.
They do not contain credentials, secret values, or raw environment dumps.

## Lifecycle and enforcement

1. `bootstrap-engineering-os` first resolves the target directory, confirms it
   is inside its own Git top-level directory, and creates missing files only.
   Existing instructions and CI configuration are preserved through explicitly
   delimited managed sections or a reviewable patch.
2. `start-task` creates a task record and project-local state lock. It refuses
   a conflicting active owner unless an explicit handoff or release occurs.
3. The working agent updates task locations and evidence after each meaningful
   verification step. It must use repository-relative `path:line` references.
4. `record-incident` creates linked incident and lesson drafts in one operation.
   It does not close either record.
5. `handoff-task` validates all referenced files and records a transferable,
   reviewable status snapshot.
6. `verify-task` validates required task fields, referenced IDs, source paths,
   evidence, and—when an incident is linked—the prevention lesson. It emits a
   pass/fail report and does not silently repair missing data.
7. CI runs safety and integrity validation for changed Engineering OS records.
   Project-native quality checks are configurable commands, executed only where
   the project has declared them.

## Adapter design

### Claude Code adapter

Adds `.claude/agents`, `.claude/skills`, `.claude/commands`, and optional
hooks. Each agent has role-specific entry criteria, artifacts, review questions,
commands, stop conditions, and closure evidence. The current generic files will
be replaced by focused procedures, including dedicated migration safety,
incident response, security, test, release, handoff, and PR review procedures.

Commands call the portable scripts and never embed separate record formats.
Hooks run non-destructive validation only. Hook failures explain the missing
record or evidence and provide the corrective command.

### Tool-neutral adapter

Adds a managed section to `AGENTS.md` and publishes portable lifecycle rules.
Codex and other coding agents use the same scripts and `.engineering-os`
records. Adapter instructions require task pickup and handoff records with
source-level references, but do not assume a particular agent runtime.

## Specialized roles

The existing role names remain, but their content becomes specific. Examples:

- The database migration reviewer must require expand/contract strategy, lock
  analysis, forward/rollback statements, backup/restore proof, data validation,
  and migration test evidence.
- The incident debugger must contain, reproduce, contain, isolate, explain,
  correct, regression-test, and record the incident and lesson.
- The PR reviewer must return findings with severity, `path:line`, evidence,
  recommended action, and final `approved` or `blocked` verdict.
- The session handoff agent must verify working-tree state and record source
  locations, commands/results, risks, unresolved decisions, and the next
  owner's first action.
- The security reviewer must evaluate trust boundaries, authorization, secrets,
  data flow, dependency provenance, abuse cases, and verification evidence.

## Safety model

- All operations reject paths outside the selected project's Git root.
- Bootstrap is idempotent and defaults to dry-run before writes.
- No script runs network operations, installs dependencies, changes remote Git
  configuration, accesses production services, or performs database mutations.
- Secret patterns are redacted from evidence; evidence files are restricted to
  commands, exit codes, timestamps, and safe summaries.
- Active locks include owner, timestamp, and expiry. Stale locks are reported;
  they require a deliberate release or handoff rather than automatic takeover.

## Implementation technology

Node.js is the canonical implementation runtime because it is cross-platform
and straightforward to invoke from Claude Code, Codex, CI, and PowerShell.
PowerShell launchers support Windows usage. JSON Schema validates machine data;
Markdown templates provide readable records. The core must avoid third-party
runtime dependencies unless a dependency audit approves one.

## Test strategy

Automated tests use fixture Git repositories to prove:

1. Bootstrap creates the expected missing structure and is idempotent.
2. Bootstrap and every record command reject paths outside the fixture root.
3. Task start creates valid ID/state and detects ownership conflict.
4. Valid task closure passes; missing evidence, invalid source location, and
   unresolved incident fail with precise errors.
5. Incident creation creates a linked lesson; an unenforced lesson fails.
6. Handoffs preserve exact source locations and reject unknown tasks.
7. Claude and tool-neutral adapters reference the same schemas and commands.
8. CI validation runs successfully on a clean fixture.

## Acceptance criteria

- A new project can bootstrap the tool-neutral core safely and repeatably.
- A Claude project can add its adapter without forking core records.
- A task, incident, lesson, and handoff can be created and linked entirely
  offline, with validated repository-relative `path:line` references.
- `verify-task` prevents closing work that lacks required evidence or a
  validated prevention lesson for a linked incident.
- Every current agent and skill has a specialized, non-identical procedure.
- The kit has documented setup, operating rules, schemas, test fixtures, and
  CI template.
- Existing files are not silently overwritten, and no command can operate on
  files outside the chosen project root.

## Delivery stages

1. Repository hygiene and core documentation.
2. Schemas, templates, pure validators, and tests.
3. Bootstrap and lifecycle command-line tools.
4. Tool-neutral and Claude Code adapters.
5. CI template, self-test fixture, and final harness audit.

## Open implementation decisions

1. Choose the local Node.js version support after inspecting the target runtime.
2. Select the repository license before publishing or sharing the kit.
3. Decide whether project-native quality commands are configured in a single
   `.engineering-os/config.json` file or discovered conservatively from existing
   package/CI configuration. The implementation defaults to explicit config for
   safety and predictability.
