# Claude Code Role Protocols

Each role must create/update the active `.engineering-os` task and attach its
own evidence before reporting completion. Findings always cite `path:line`.

| Role | Required specialist evidence |
|---|---|
| repository-cartographer | module map, entry points, dependencies, test surfaces |
| requirements-analyst | acceptance criteria, non-goals, ambiguity decisions |
| implementation-planner | file-level sequence, interfaces, rollback and verification |
| architecture-reviewer | boundaries, alternatives, ADR recommendation |
| brownfield-compatibility | compatibility matrix and breakage risks |
| deduplication-guardian | search evidence and reuse/extension decision |
| code-builder | minimal diff and slice-level test evidence |
| tdd-test-engineer | failing behavior proof, test owner, final passing proof |
| unit-test-specialist | deterministic unit cases and boundary coverage |
| integration-test-specialist | service/API/database boundary evidence |
| e2e-browser-tester | real user journey, browser evidence, accessibility result |
| api-contract-reviewer | request/response compatibility and consumer impact |
| database-migration-reviewer | expand/contract, locks, backup, validation, rollback |
| security-reviewer | trust boundaries, abuse paths, authorization and secret checks |
| dependency-auditor | necessity, version, license, provenance, risk decision |
| secret-scanner | scan command, redacted result, remediation reference |
| performance-reviewer | baseline, measurement, regression threshold and result |
| context-optimizer | context budget, retrieval strategy and irrelevant-data removal |
| code-quality-reviewer | maintainability findings with priority and path:line |
| ui-ux-reviewer | accessibility, responsive behavior and interaction findings |
| documentation-engineer | affected docs, accuracy checks and usage example |
| agent-skill-author | trigger, scope, procedure and exit criteria for each skill |
| agent-harness-auditor | complete inventory, gaps, duplicate/policy analysis |
| memory-planner | retention policy, schema and privacy/data minimization review |
| codebase-indexer | symbol map, call/dependency graph and test ownership |
| git-workflow-manager | branch/worktree status, safe commit and recovery guidance |
| worktree-manager | isolation path, branch ownership and cleanup status |
| pr-review-agent | prioritized findings, `path:line`, verdict and residual risk |
| ci-cd-engineer | deterministic pipeline stages, cache/secrets and failure policy |
| release-readiness | release checklist, artifact/config and go/no-go evidence |
| production-safety | rollback, observability, failure criteria and approval gates |
| incident-debugger | timeline, containment, reproduction, root cause, incident/lesson |
| dependency-update-manager | changelog, compatibility, lockfile and rollback evidence |
| benchmark-evaluator | repeatable corpus, baseline, metric and threshold result |
| external-tool-vetting | license, install scripts, permissions, network/dependency audit |
| session-handoff-agent | state, source locations, commands/results, risks and next action |
| release-orchestrator | coordinated release evidence, decision log and post-release check |

No role may substitute a generic checklist for the named evidence above.
