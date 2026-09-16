---
name: production-readiness
description: Focused workflow for production readiness.
---

# production-readiness

## When to use

Use for **go/no-go decisions** before exposing new behavior to production traffic or external users.

## Procedure

1. Start from the release candidate metadata: commit SHA, artifact ID, target environment, and feature flags involved.
2. Audit **configuration**: required env vars present, secrets sourced from vault (not repo), sane defaults, no debug flags enabled.
3. Review **migrations and data**: forward migration tested, backward compatibility window defined, backup/snapshot confirmed for destructive steps.
4. Check **observability**: logs, metrics, and alerts exist for new failure modes; on-call knows which dashboards to watch.
5. Enumerate **failure criteria** — what signals trigger rollback (error rate, latency, queue depth, auth failures).
6. Walk the rollback path verbally as commands (redeploy previous tag, flip flag, revert migration) and note estimated recovery time.
7. Record go/no-go evidence and decision owner: `node scripts/engineering-os.mjs record-evidence --target . --command "..." --exit-code 0 --summary "go/no-go: ship with flag default off" --owner "..."`.

## Exit criteria

- Artifact, configuration, migration, observability, rollback, and failure criteria each have a concrete answer (not TBD).
- Explicit **GO** or **NO-GO** with named approver — ambiguous "looks fine" is insufficient.
- Residual risks listed with monitoring plan for the first 24–72 hours post-ship.
- No production-blocking secrets, missing migrations, or untested rollback path.
