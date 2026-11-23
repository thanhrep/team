param(
    [string]$TaskName = "BIZWORK Server",
    [string]$ScriptPath = ""
)
$ErrorActionPreference = "Stop"
if (-not $ScriptPath) { $ScriptPath = Join-Path $PSScriptRoot "start-bizwork.ps1" }
$ScriptPath = (Resolve-Path $ScriptPath).Path
$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Force | Out-Null
Write-Host "Created startup task: $TaskName"
