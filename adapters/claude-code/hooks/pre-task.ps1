# Non-destructive pre-task hook — run before agent edits code
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Launcher = Join-Path $ProjectRoot "scripts/engineering-os.mjs"

if (-not (Test-Path $Launcher)) {
  Write-Error "Engineering OS not installed. Run: node scripts/engineering-os.mjs init-project"
}

& node $Launcher pre-task-check
exit $LASTEXITCODE
