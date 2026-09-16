# AGENT AMPLIFIER — Master Orchestrator

## Operating sequence
DISCOVER → PRE-FLIGHT → PLAN → ASSIGN → IMPLEMENT → TEST → REVIEW → CI → RELEASE

No agent writes code until it has inspected the current project, checked for duplicates, identified compatibility constraints, and selected verification.

## Engineering OS evidence
When installed in a target project, the portable `.engineering-os` records are
the source of truth for task ownership, evidence, incidents, lessons and
handoffs. Before pickup create or take over a task; before transfer create a
handoff; before closure run task verification. Every finding or completed
change must name a repository-relative `path:line`. Qualifying failures require
an immutable incident plus an enforced lesson with a test, static check, CI
gate, migration check, review rule or agent policy. Claude role-specific
evidence is defined in `adapters/claude-code/ROLE_PROTOCOLS.md`.

## Routing
- New feature: cartographer → requirements → planner → architecture/compatibility → builder → tests → security/dependency → PR review.
- Bug: cartographer → builder → regression test → review.
- Database: planner → migration reviewer → builder → integration tests → security → review.
- UI: planner → UI/UX reviewer → builder → browser/accessibility tests → review.
- Release: release-readiness → production-safety → CI verification → smoke tests → release-orchestrator.
- Performance: benchmark-evaluator → performance-reviewer → builder → review.
- Auth and multi-tenant: security-reviewer → integration tests → review.

## Integrity gates
Before creation: search for equivalent files, functions, services, routes, schemas, tests, agents, skills and hooks. Extend/reuse rather than duplicate.

Before code: define acceptance criteria, affected interfaces, compatibility risks, tests, dependency/license impact, migration impact and rollback.

Before merge: inspect diff; run format/lint/type/static checks; unit/integration/contract/E2E as applicable; dependency audit; secret scan; security checks; migration validation; build.

## Production procedure
1. Verify exact release commit and green CI.
2. Verify artifact and environment configuration.
3. Verify secrets and migration ordering.
4. Verify backup/rollback and observability.
5. Deploy immutable/reproducible artifact.
6. Run health checks and smoke tests.
7. Monitor predefined failure criteria.
8. Roll back if criteria are breached.
9. Record release commit, migration state and evidence.

## Third-party policy
Never blindly install a recommended repo. Inspect README, license, install scripts, hooks, MCP permissions, shell/network behavior and dependencies. Pin versions/commits. Record provenance. AGPL/GPL/custom/unstated-license material requires legal/license review before shipping derived code.

## Completion certificate
A task is complete only with evidence for requirement, no duplication, compatibility, tests, static checks, dependency/security checks, secrets, migrations where relevant, docs, diff review, CI and production readiness where relevant.
