#!/usr/bin/env bash
# Vela · off-box Postgres backup (runs ON the server via cron).
#
# WHY: backup_db.sh keeps dumps under ./backups on the SAME box as the DB. If the
# box dies (disk failure, provider incident, accidental server delete) you lose
# the DB *and* every local backup with it. This script takes a compressed dump
# and pushes a COPY OFF-box to object storage (S3 / Cloudflare R2 / Backblaze B2)
# via rclone, so a single-box loss no longer means total data loss.
#
# ── SETUP (on the server, once) ──────────────────────────────────────────────
#   1. Install rclone:            https://rclone.org/install/
#   2. Configure a remote:        rclone config
#        Pick your object storage (S3 / R2 / B2), name the remote (e.g. "r2"),
#        and create a bucket (e.g. "vela-backups"). rclone stores its own creds
#        in ~/.config/rclone/rclone.conf — NO secrets live in this script.
#   3. Set the env var pointing at "<remote>:<bucket>[/path]", e.g.:
#        export BACKUP_RCLONE_REMOTE="r2:vela-backups"
#      (put it in the cron line or a sourced env file — see below).
#
# ── ENV VARS ─────────────────────────────────────────────────────────────────
#   BACKUP_RCLONE_REMOTE   (required for off-box) rclone target, e.g. "r2:vela-backups".
#                          If UNSET, the script still makes a LOCAL dump and warns,
#                          but does NOT fail — so cron stays green while you finish setup.
#   BACKUP_RETAIN_DAYS     (optional, default 14) days to keep local + remote dumps.
#
# ── INSTALL (cron) ───────────────────────────────────────────────────────────
#   chmod +x /opt/vela-backend/backup_offbox.sh
#   ( crontab -l 2>/dev/null; \
#     echo '30 3 * * * BACKUP_RCLONE_REMOTE=r2:vela-backups /opt/vela-backend/backup_offbox.sh >> /opt/vela-backend/backups/offbox.log 2>&1' \
#   ) | crontab -
#
# ── RESTORE (from off-box) ───────────────────────────────────────────────────
#   rclone copy r2:vela-backups/vela-YYYYMMDD-HHMMSS.sql.gz ./
#   gunzip -c vela-YYYYMMDD-HHMMSS.sql.gz | \
#     docker compose -f docker-compose.staging.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

RETAIN="${BACKUP_RETAIN_DAYS:-14}"
COMPOSE="docker compose -f docker-compose.staging.yml"

# Read DB creds from .env (same source of truth as backup_db.sh), with sane defaults.
PGUSER=$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2-); : "${PGUSER:=vela}"
PGDB=$(grep -E '^POSTGRES_DB=' .env | cut -d= -f2-); : "${PGDB:=vela}"

mkdir -p backups
TS=$(date +%Y%m%d-%H%M%S)
OUT="backups/vela-${TS}.sql.gz"

# 1) Compressed dump to a LOCAL dir first (fast, and gives us a local copy too).
#    --no-owner so it restores under any role; --clean --if-exists for idempotent restore.
$COMPOSE exec -T postgres pg_dump -U "$PGUSER" -d "$PGDB" --no-owner --clean --if-exists < /dev/null \
  | gzip > "$OUT"

SIZE=$(du -h "$OUT" | cut -f1)
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) local dump OK -> $OUT ($SIZE)"

# 2) Off-box upload. If no remote configured, warn and stop here (do NOT fail).
REMOTE="${BACKUP_RCLONE_REMOTE:-}"
if [ -z "$REMOTE" ]; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) WARN off-box remote not configured (set BACKUP_RCLONE_REMOTE); local backup only" >&2
  exit 0
fi

if ! command -v rclone >/dev/null 2>&1; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) WARN rclone not installed; local backup only (see https://rclone.org/install/)" >&2
  exit 0
fi

# Copy the dump off-box. rclone copy is idempotent and only transfers this file.
rclone copy "$OUT" "$REMOTE"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) off-box copy OK -> $REMOTE/$(basename "$OUT")"

# 3) Rotation.
#    Local: delete dumps older than RETAIN days (mirrors backup_db.sh).
find backups -name 'vela-*.sql.gz' -type f -mtime +"$RETAIN" -delete

#    Off-box: best-effort. --min-age is supported by most object-storage backends;
#    if the remote can't do it, we log and move on rather than failing the backup.
if rclone delete --min-age "${RETAIN}d" "$REMOTE" --include 'vela-*.sql.gz' 2>/dev/null; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) off-box rotation OK (removed remote dumps older than ${RETAIN}d)"
else
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) WARN off-box rotation skipped (remote may not support --min-age); prune manually" >&2
fi
