#!/usr/bin/env bash
#
# Trip Report — Nightly PostgreSQL backup with rotation
# Runs via systemd timer as the postgres user
#
set -euo pipefail

DB_NAME="trip_reports"
BACKUP_DIR="/opt/trip-report/backups"
UPLOAD_DIR="/opt/trip-report/backend/uploads"
RETAIN_DAYS=30
DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/trip_reports_${DATE}.sql.gz"
UPLOADS_BACKUP="${BACKUP_DIR}/uploads_${DATE}.tar.gz"

mkdir -p "${BACKUP_DIR}"

# --- Database dump (compressed) ---
echo "[$(date)] Starting database backup..."
pg_dump "${DB_NAME}" | gzip > "${BACKUP_FILE}"
echo "[$(date)] Database backed up to ${BACKUP_FILE}"

# --- Uploaded images backup ---
if [ -d "${UPLOAD_DIR}" ] && [ "$(ls -A "${UPLOAD_DIR}" 2>/dev/null)" ]; then
    tar czf "${UPLOADS_BACKUP}" -C "$(dirname "${UPLOAD_DIR}")" "$(basename "${UPLOAD_DIR}")"
    echo "[$(date)] Uploads backed up to ${UPLOADS_BACKUP}"
else
    echo "[$(date)] No uploads to back up, skipping."
fi

# --- Rotate: delete backups older than RETAIN_DAYS ---
find "${BACKUP_DIR}" -name "trip_reports_*.sql.gz" -mtime +${RETAIN_DAYS} -delete
find "${BACKUP_DIR}" -name "uploads_*.tar.gz" -mtime +${RETAIN_DAYS} -delete
echo "[$(date)] Cleaned up backups older than ${RETAIN_DAYS} days."

# --- Summary ---
BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "trip_reports_*.sql.gz" | wc -l)
BACKUP_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
echo "[$(date)] Backup complete. ${BACKUP_COUNT} backups on disk, total size: ${BACKUP_SIZE}"
