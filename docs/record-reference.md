# Record reference

All records are JSON stored below `.engineering-os` and are reviewed like source
code. IDs are stable (`TASK-YYYYMMDD-001`, `INC-YYYYMMDD-001`, and
`LES-YYYYMMDD-001`).

| Record | Purpose | Required linkage |
|---|---|---|
| Task | Ownership, scope, acceptance, locations, evidence | Evidence; incidents when applicable |
| Incident | Qualifying failure and root cause | One task and one lesson |
| Lesson | Enforceable prevention | One incident, enforcement location, validation evidence |
| Handoff | Agent-to-agent transfer | Existing task and source locations |
| Evidence | Safe command/result summary | Referenced by task/lesson |

Do not put credentials, full environment dumps, customer data, or raw secrets
in any record.
