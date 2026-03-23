$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$webRoot = Join-Path $repoRoot "web"
$port = 8000

if (-not (Test-Path $webRoot)) {
  throw "Web-Root nicht gefunden: $webRoot"
}

$pythonCommand = $null
if (Get-Command py -ErrorAction SilentlyContinue) {
  $pythonCommand = "py"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  $pythonCommand = "python"
}

if (-not $pythonCommand) {
  Write-Host "Kein Python-Interpreter gefunden." -ForegroundColor Yellow
  Write-Host "Bitte installiere Python oder starte einen lokalen HTTP-Server auf dem Ordner '$webRoot'." -ForegroundColor Yellow
  exit 1
}

Write-Host "Starte lokalen Server fuer $webRoot auf http://localhost:$port/" -ForegroundColor Green
Write-Host "Beispiele:" -ForegroundColor Green
Write-Host "  http://localhost:$port/dem.html"
Write-Host "  http://localhost:$port/kaderstatus.html"

Push-Location $webRoot
try {
  if ($pythonCommand -eq "py") {
    & py -m http.server $port
  } else {
    & python -m http.server $port
  }
} finally {
  Pop-Location
}
