# Non-destructive pre-task hook

Executable hooks live at `.engineering-os/hooks/` after `init-project`:

- Windows: `.engineering-os/hooks/pre-task.ps1`
- Unix: `.engineering-os/hooks/pre-task.sh`

Both run `node scripts/engineering-os.mjs pre-task-check`, which verifies
initialization, active task ownership, and record integrity. Hooks never modify
files, install packages, or contact external services.
