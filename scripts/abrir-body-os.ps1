# Abre o BODY OS numa janela própria. Liga o servidor local se ele ainda não estiver rodando.
# Usado pelo atalho da Área de Trabalho; também pode ser executado direto.
$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $PSScriptRoot
$url = "http://localhost:5173/"
$log = Join-Path $env:TEMP "body-os-dev.log"

# Só conta como "rodando" se a porta responde com o próprio BODY OS, não outro projeto.
function Test-BodyOS {
  try {
    $page = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
    return $page.Content -match "data-bodyos-shell"
  } catch {
    return $false
  }
}

if (-not (Test-BodyOS)) {
  # O vinext deixa .vinext/dev/lock.json quando o servidor é encerrado à força.
  # Se o PID gravado for reaproveitado por outro processo, ele acha que o servidor
  # ainda roda e se recusa a iniciar. Como a porta não respondeu, a trava é velha.
  $lock = Join-Path $project ".vinext\dev\lock.json"
  if (Test-Path $lock) { Remove-Item $lock -Force }
  Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c npm run dev > `"$log`" 2>&1" `
    -WorkingDirectory $project -WindowStyle Hidden
  $deadline = (Get-Date).AddSeconds(90)
  while (-not (Test-BodyOS)) {
    if ((Get-Date) -gt $deadline) {
      $shell = New-Object -ComObject WScript.Shell
      $null = $shell.Popup(
        "O servidor do BODY OS não respondeu em 90 segundos.`nDetalhes em: $log",
        0, "BODY OS", 16)
      exit 1
    }
    Start-Sleep -Milliseconds 700
  }
}

# Janela de app do Edge (sem abas nem barra de endereço); sem Edge, o navegador padrão.
$edge = Join-Path ${env:ProgramFiles(x86)} "Microsoft\Edge\Application\msedge.exe"
if (Test-Path $edge) {
  Start-Process -FilePath $edge -ArgumentList "--app=$url"
} else {
  Start-Process $url
}
