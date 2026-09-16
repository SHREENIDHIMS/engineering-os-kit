---
name: release-verification
description: Focused workflow for release verification.
---

# release-verification

## When to use

Use when **tagging, deploying, or promoting a build** and you must prove the exact artifact that ships is healthy and rollback-ready.

## Procedure

1. Pin the release commit: record full SHA, tag name (if any), and branch — `git rev-parse HEAD` at release cut time.
2. Confirm CI passed on that SHA (link run URL or `gh run list --commit <sha>`); reject "works locally" without CI correlation.
3. Build or fetch the release artifact; record immutable identifier (digest, version string, build ID).
4. Run smoke tests against the **candidate artifact** — health endpoint, critical read path, auth login, one write path if safe in target env.
5. Document rollback: previous version/tag, revert command, migration down strategy (if any), and who approves rollback.
6. Capture proof per check: `node scripts/engineering-os.mjs record-evidence --target . --command "..." --exit-code 0 --summary "smoke: /health 200 on vX.Y.Z" --owner "..."`.
7. Close the release task only after evidence linked: `node scripts/engineering-os.mjs verify-task --target . --task <id>`.

## Exit criteria

- Exact commit SHA, CI status, and artifact identifier recorded and mutually consistent.
- Smoke tests pass on the candidate — not on a different build.
- Rollback steps are executable commands, not prose-only intent.
- Release outcome (ship / hold) recorded with linked evidence IDs.
