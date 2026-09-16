---
name: security-baseline
description: Focused workflow for security baseline.
---

# security-baseline

## When to use

Use before merge or release when changes touch **authentication, authorization, secrets, user input, file/network access, or third-party code execution**.

## Procedure

1. Gate the review: `node scripts/engineering-os.mjs pre-task-check --target .` and read enforced rules in `.engineering-os/LESSONS_LEARNED.md`.
2. Draw trust boundaries — mark entry points (HTTP handlers, CLI args, webhooks, uploads) and what each identity may access.
3. Trace authorization for every new or changed route/handler; confirm department/role checks live in the enforcement layer (e.g., SQL `WHERE`, middleware), not only in UI.
4. Scan the diff and working tree for secrets (.env patterns, API keys, private keys, connection strings); reject staging any credential file.
5. Walk abuse paths: injection (SQL/command/template), path traversal, SSRF, rate limits, and privilege escalation — note mitigations or gaps.
6. Run targeted security tests or static checks; record each run: `node scripts/engineering-os.mjs record-evidence --target . --command "..." --exit-code 0 --summary "authz boundary verified" --owner "..."`.
7. For qualifying failures, open tracked remediation: `node scripts/engineering-os.mjs record-incident --target . --task <id> --severity high --root-cause "..." --reproduction "..." --prevention-type "..." --enforcement-location "path:line"` — do not close the task until contained or explicitly accepted by an authorized owner.

## Exit criteria

- No unmitigated high/critical findings (auth bypass, secret exposure, injection, untrusted code execution, sensitive-data disclosure).
- Trust boundaries and authorization paths documented with `path:line` references.
- Security verification commands recorded as evidence on the active task.
- Any accepted residual risk is explicit, scoped, and owner-approved.
