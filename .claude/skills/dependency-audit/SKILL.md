---
name: dependency-audit
description: Focused workflow for dependency audit.
---

# dependency-audit

## When to use

Use before **adding, upgrading, or replacing** a library, tool, or runtime dependency that enters the build, serve, or CI path.

## Procedure

1. State the capability gap in one sentence — if stdlib or an existing in-repo helper suffices, stop and reuse.
2. List candidate packages with version pin, license (SPDX), maintainer activity, and install footprint (native extensions, postinstall scripts).
3. Compare alternatives on necessity, not popularity — document why the chosen package wins and what was rejected.
4. Run vulnerability posture for the pinned version (`npm audit`, `pip-audit`, `cargo audit`, or OSV lookup); note accepted vs blocking CVEs.
5. Install in a clean branch or worktree; inspect lockfile diff and transitive additions — flag packages with install hooks or network calls.
6. Prove the dependency is actually used (import/call site) and removable: note rollback command (`npm uninstall`, revert lockfile commit).
7. Record audit outcome: `node scripts/engineering-os.mjs record-evidence --target . --command "..." --exit-code 0 --summary "dep: pkg@1.2.3 MIT, 0 critical CVEs" --owner "..."`.

## Exit criteria

- Necessity, license, pinned version, and provenance documented on the task.
- Vulnerability posture stated — no unreviewed critical/high CVEs in the serving path.
- Lockfile diff reviewed; no surprise transitive install scripts.
- Rollback/removal path is a single reversible Git or package-manager operation.
