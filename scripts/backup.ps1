$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
New-Item -ItemType Directory -Force -Path ".\backups" | Out-Null
docker compose exec -T db pg_dump -U bizwork -d bizwork -Fc | Set-Content -Encoding Byte ".\backups\database-$stamp.dump"
docker compose cp app:/data/media ".\backups\media-$stamp"
tar -czf ".\backups\media-$stamp.tar.gz" -C ".\backups" "media-$stamp"
Remove-Item -Recurse -Force ".\backups\media-$stamp"
Write-Host "Backup complete: .\backups\database-$stamp.dump and media-$stamp.tar.gz"
