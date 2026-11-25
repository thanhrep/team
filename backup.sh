#!/usr/bin/env sh
set -eu
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p ./backups
docker compose exec -T db pg_dump -U bizwork -d bizwork -Fc > "./backups/database-$STAMP.dump"
docker compose cp app:/data/media "./backups/media-$STAMP"
tar -czf "./backups/media-$STAMP.tar.gz" -C "./backups" "media-$STAMP"
rm -rf "./backups/media-$STAMP"
echo "Backup complete: ./backups/database-$STAMP.dump and media-$STAMP.tar.gz"
