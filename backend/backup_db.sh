#!/usr/bin/env bash
# Vela · nightly Postgres backup with rotation (runs ON the server via cron).
#
# Dumps the live Postgres DB to a gzip file under ./backups and keeps the last
# RETAIN days. This protects against LOGICAL loss (bad migration, accidental
# delete, app bug). It does NOT protect against losing the whole box — pair it
# with Hetzner automated server backups/snapshots (enable in the Hetzner console)
# and, ideally, copy the dumps OFF-box (S3/Backblaze) too.
#
# Install (on the server, once):
#   chmod +x /opt/vela-backend/backup_db.sh
#   ( crontab -l 2>/dev/null; echo '0 3 * * * /opt/vela-backend/backup_db.sh >> /opt/vela-backend/backups/backup.log 2>&1' ) | crontab -
#
# Restore a dump:
#   gunzip -c backups/vela-YYYYMMDD-HHMMSS.sql.gz | \
#     docker compose -f docker-compose.staging.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

RETAIN="${BACKUP_RETAIN_DAYS:-14}"
COMPOSE="docker compose -f docker-compose.staging.yml"

PGUSER=$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2-); : "${PGUSER:=vela}"
PGDB=$(grep -E '^POSTGRES_DB=' .env | cut -d= -f2-); : "${PGDB:=vela}"

mkdir -p backups
TS=$(date +%Y%m%d-%H%M%S)
OUT="backups/vela-${TS}.sql.gz"

# --no-owner so the dump can be restored under any role; gzip inline to save disk.
$COMPOSE exec -T postgres pg_dump -U "$PGUSER" -d "$PGDB" --no-owner --clean --if-exists \
  | gzip > "$OUT"

SIZE=$(du -h "$OUT" | cut -f1)
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) backup OK -> $OUT ($SIZE)"

# Rotate: delete dumps older than RETAIN days.
find backups -name 'vela-*.sql.gz' -type f -mtime +"$RETAIN" -delete
