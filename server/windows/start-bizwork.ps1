$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Backend = Join-Path $Root "backend"
$LogDir = Join-Path $Root "server\logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Set-Location $Backend

# Start PostgreSQL if installed as a Windows service.
Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Where-Object {$_.Status -ne "Running"} | Start-Service

# Ollama normally installs its own background service. Start it if present.
Get-Service -Name "Ollama*" -ErrorAction SilentlyContinue | Where-Object {$_.Status -ne "Running"} | Start-Service

$Python = (Get-Command python -ErrorAction Stop).Source
& $Python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1 2>&1 |
    Tee-Object -FilePath (Join-Path $LogDir "bizwork.log") -Append
