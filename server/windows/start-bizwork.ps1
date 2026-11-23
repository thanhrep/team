$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Backend = Join-Path $Root "backend"
$LogDir = Join-Path $Root "server\logs"
$EnvFile = Join-Path $Root "server\.env.server"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# Load KEY=VALUE settings for this process; never commit the real .env.server file.
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
        }
    }
}
if (-not $env:DATABASE_URL) { throw "DATABASE_URL is missing from server/.env.server" }
if (-not $env:SECRET_KEY -or $env:SECRET_KEY.Length -lt 32) { throw "Set a random SECRET_KEY of at least 32 characters." }
if (-not $env:ADMIN_INIT_PASSWORD) { throw "Set ADMIN_INIT_PASSWORD before first start; the seed step must not prompt interactively." }
$env:BIZWORK_AUTH_DISABLED = "false"

# Start PostgreSQL if installed as a Windows service.
Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Where-Object {$_.Status -ne "Running"} | Start-Service

Set-Location $Backend
$Python = (Get-Command python -ErrorAction Stop).Source
& $Python -m app.seed 2>&1 | Tee-Object -FilePath (Join-Path $LogDir "seed.log") -Append
if ($LASTEXITCODE -ne 0) { throw "BIZWORK database seed failed. See server/logs/seed.log" }

# Ollama is installed separately and normally runs as a background service.
$Ollama = Get-Command ollama -ErrorAction SilentlyContinue
if ($Ollama) {
    $ollamaRunning = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
    if (-not $ollamaRunning) { Start-Process -FilePath $Ollama.Source -ArgumentList "serve" -WindowStyle Hidden }
}

# Optional: run a pre-created Cloudflare Tunnel without opening router ports.
if ($env:CLOUDFLARED_TUNNEL_TOKEN) {
    $Cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
    if (-not $Cloudflared) { throw "CLOUDFLARED_TUNNEL_TOKEN is set but cloudflared is not installed." }
    Start-Process -FilePath $Cloudflared.Source -ArgumentList @("tunnel","run","--token",$env:CLOUDFLARED_TUNNEL_TOKEN) -WindowStyle Hidden
}

& $Python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1 2>&1 |
    Tee-Object -FilePath (Join-Path $LogDir "bizwork.log") -Append
