param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Arguments
)

$scriptRoot = Split-Path -Parent $PSScriptRoot
& node (Join-Path $scriptRoot 'src/cli.mjs') @Arguments
exit $LASTEXITCODE
