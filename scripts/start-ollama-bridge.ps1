$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$config = Join-Path $projectDir 'work/ollama-bridge.env'
if (!(Test-Path -LiteralPath $config)) { throw 'A conexão local ainda não foi configurada.' }
$pidFile = Join-Path $projectDir 'work/ollama-bridge.pid'
if (Test-Path -LiteralPath $pidFile) {
  $existingId = [int](Get-Content -LiteralPath $pidFile)
  $existing = Get-CimInstance Win32_Process -Filter "ProcessId=$existingId"
  if ($existing.CommandLine -like '*scripts/ollama-bridge.mjs*') { Write-Output 'Conexão já está em execução.'; exit 0 }
}
$bridgeProcess = Start-Process -FilePath (Get-Command node).Source -ArgumentList 'scripts/ollama-bridge.mjs','work/ollama-bridge.env' -WorkingDirectory $projectDir -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectDir 'work/ollama-bridge.log') -RedirectStandardError (Join-Path $projectDir 'work/ollama-bridge-error.log') -PassThru
$bridgeProcess.Id | Set-Content -LiteralPath $pidFile
Write-Output 'Conexão BODY OS iniciada. Mantenha também o Ollama ligado.'
