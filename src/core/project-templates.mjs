export const projectIndexTemplate = `# Engineering OS — Project Index

Auto-maintained dashboard for this project. Do not edit task JSON by hand; use the CLI.

## New project checklist

1. Run \`engineering-os start-task\` before any code change.
2. Read \`LESSONS_LEARNED.md\` before pickup — do not repeat enforced rules.
3. Record qualifying failures in \`MISTAKES.md\` via \`record-incident\`.
4. Use \`path:line\` for every finding, change, and handoff.
5. Run \`verify-task\` before marking work complete.

## Active state

| Field | Value |
|-------|-------|
| Initialized | {{initializedAt}} |
| Kit version | {{kitVersion}} |
| Active task | none |

See \`tasks/\`, \`handoffs/\`, \`incidents/\`, and \`lessons/\` for JSON records.
`;

export const mistakesTemplate = `# Project Mistakes Log

Append-only log of confirmed failures (bugs, bad features, database issues, security defects, release failures, agent errors).

Record new entries with \`engineering-os record-incident\`. Each entry links to \`INC-*\` and \`LES-*\` JSON under \`.engineering-os/\`.

| Date | ID | Severity | Category | Summary | Root cause | Locations | Lesson |
|------|-----|----------|----------|---------|------------|-----------|--------|
`;

export const lessonsTemplate = `# Lessons Learned

Enforced prevention rules for this project. Read before starting any task.

Record and enforce with \`record-incident\` then \`enforce-lesson\`. Each rule must point to a real prevention mechanism at \`path:line\`.

| ID | Rule | Prevention type | Enforcement location | Status |
|----|------|-----------------|----------------------|--------|
`;

export function renderTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '');
}
