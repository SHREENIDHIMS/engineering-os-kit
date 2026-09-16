---
name: ci-quality-gates
description: Focused workflow for ci quality gates.
---

# ci-quality-gates

## When to use

Use when **adding/changing CI workflows** or diagnosing why a PR is blocked — ensure gates are deterministic and locally reproducible.

## Procedure

1. Inventory pipeline stages from workflow files (`.github/workflows/`, `gitlab-ci.yml`, etc.) — list job name, trigger paths, and required secrets.
2. Classify each gate: lint, typecheck, unit, integration, build, security scan — note which are merge-blocking vs informational.
3. Reproduce the failing gate locally with the same command CI uses (read the workflow YAML — do not guess npm script names).
4. Fix root cause in application or workflow code; avoid `continue-on-error` or silent skips unless explicitly authorized.
5. For new gates, define path filters so unrelated edits do not burn CI minutes; document required env vars in README or workflow comments.
6. Run the full local equivalent sequence; capture each gate: `node scripts/engineering-os.mjs record-evidence --target . --command "npm test && npm run lint" --exit-code 0 --summary "CI gates green locally" --owner "..."`.
7. Push and confirm remote CI run matches local exit codes on the same commit SHA.

## Exit criteria

- Every merge-blocking gate has a documented local reproduction command.
- Workflow changes include trigger paths and secret requirements — no mystery env failures for contributors.
- Failing diagnostics point to actionable logs, not generic "job failed".
- Local and remote CI agree on pass/fail for the PR commit.
