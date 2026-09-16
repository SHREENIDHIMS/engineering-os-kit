# Engineering OS Kit — Capability Audit

Audit date: 2026-09-16. Evidence: `npm test` (22 tests), focused lifecycle/schema tests, source review, implementation plan slices 1–5.

## Summary

| Area | Status | Evidence |
|------|--------|----------|
| Portable CLI lifecycle | Complete | `src/cli.mjs`, 21 commands |
| Project-local vendoring | Complete | `.engineering-os/kit/`, `scripts/engineering-os.mjs` |
| Mistake / lesson memory | Complete | JSON + MISTAKES.md / LESSONS_LEARNED.md sync |
| Agent handoff continuity | Complete | handoff, accept-handoff, show-handoff, show-task |
| Schema validation on write | Complete | `schema-validate.mjs`, 6 schemas |
| Pre-task enforcement | Complete | pre-task-check + executable hooks |
| Target CI | Complete | `ci/engineering-os-target.yml` → `.github/workflows/` |
| Claude adapter | Complete | 37 agents, 17 skills, 12 commands |
| Policies | Complete | `core/policies/lifecycle.md`, `closure-rules.md` |
| E2E lifecycle test | Complete | `test/e2e/lifecycle.test.mjs` |
| GitHub install docs | Complete | `docs/github-install.md` |

## CLI commands

| Command | Purpose | Tested |
|---------|---------|--------|
| bootstrap | Dry-run / apply project setup | Yes |
| init-project | Full install + adapter | Yes |
| start-task | Active task lock | Yes |
| show-task | Task briefing | Yes |
| show-handoff | Handoff briefing | Yes |
| update-task | Locations / evidence | Yes |
| record-evidence | Command proof | Yes |
| record-incident | INC + LES pair | Yes |
| record-decision | ADR-style decisions | Yes |
| enforce-lesson | Prevention enforcement | Yes |
| handoff | Agent transfer | Yes |
| accept-handoff | Resume ownership | Yes |
| list-incidents | Query mistakes | Yes |
| list-lessons | Query rules | Yes |
| list-tasks | Query task records | Yes |
| list-handoffs | Query handoff records | Yes |
| list-decisions | Query decision records | Yes |
| list-evidence | Query evidence records | Yes |
| verify-task | Closure gate | Yes |
| pre-task-check | Pre-edit gate | Yes |
| check-project-safety | Location integrity | Yes |

## Agent harness

| Metric | Count | Notes |
|--------|-------|-------|
| Specialist agents | 37 | Engineering OS block in each |
| Unique skill workflows | 17 | De-templated procedures |
| Role-specific gates | 5+ | incident, migration, security, PR, handoff |
| Shared procedure | `_SHARED.md` | Available alongside role-specific protocols; specialized roles retain unique gates |

## Safety invariants

| Invariant | Enforced |
|-----------|----------|
| Operations stay inside Git root | `resolveGitRoot`, `validateLocation` |
| Bootstrap idempotent | Tests |
| No silent complete status | update-task rejects `complete` |
| Incidents require enforced lessons | verify-task |
| Draft lessons skip evidence requirement | schema-validate |
| Handoff blocks new tasks | start-task + pre-task-check |

## Known gaps (future)

| Gap | Priority |
|-----|----------|
| Split CLI into `src/commands/*.mjs` | Low |
| JSON Schema draft-2020 full validator library | Low |
| Stale task lock expiry | Medium |
| `record-decision` sync to INDEX.md table | Low |
| Renumber agents 37–40 → 34–37 | Low |

## Acceptance (implementation plan)

- [x] Bootstrap safe and idempotent
- [x] Task / incident / lesson / handoff linked offline
- [x] verify-task prevents incomplete closure
- [x] path:line validated inside Git root
- [x] Tool-neutral + Claude adapters share record format
- [x] CI template for target projects
- [x] E2E fixture-driven lifecycle test
- [x] Capability audit document
