$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectDir 'work/ollama-bridge.pid'
if (Test-Path -LiteralPath $pidFile) {
  $existingId = [int](Get-Content -LiteralPath $pidFile)
  $existing = Get-CimInstance Win32_Process -Filter "ProcessId=$existingId"
  if ($existing.CommandLine -like '*scripts/ollama-bridge.mjs*') { Stop-Process -Id $existingId }
}
Write-Output 'Conexão BODY OS parada.'
