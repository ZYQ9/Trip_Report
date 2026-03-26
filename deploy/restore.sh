#!/usr/bin/env bash
#
# Trip Report — Restore from backup
# Usage: sudo ./restore.sh [backup_file.sql.gz] [uploads_archive.tar.gz]
#
# If no arguments given, lists available backups and prompts for selection.
#
set -euo pipefail

DB_NAME="trip_reports"
DB_USER="tripreport"
BACKUP_DIR="/opt/trip-report/backups"
UPLOAD_DIR="/opt/trip-report/backend/uploads"

# ---- List available backups ----
list_backups() {
    echo ""
    echo "Available database backups:"
    echo "-------------------------------------------"
    local i=1
    BACKUPS=()
    while IFS= read -r f; do
        SIZE=$(du -h "$f" | cut -f1)
        echo "  ${i}) $(basename "$f")  [${SIZE}]"
        BACKUPS+=("$f")
        ((i++))
    done < <(ls -t "${BACKUP_DIR}"/trip_reports_*.sql.gz 2>/dev/null)

    if [ ${#BACKUPS[@]} -eq 0 ]; then
        echo "  No backups found in ${BACKUP_DIR}"
        exit 1
    fi
    echo ""
}

# ---- Determine which backup to restore ----
if [ $# -ge 1 ]; then
    DB_BACKUP="$1"
else
    list_backups
    read -rp "Select backup number to restore: " SELECTION
    if [ "$SELECTION" -lt 1 ] || [ "$SELECTION" -gt ${#BACKUPS[@]} ]; then
        echo "Invalid selection."
        exit 1
    fi
    DB_BACKUP="${BACKUPS[$((SELECTION - 1))]}"
fi

if [ ! -f "${DB_BACKUP}" ]; then
    echo "Error: Backup file not found: ${DB_BACKUP}"
    exit 1
fi

echo ""
echo "WARNING: This will DROP and recreate the '${DB_NAME}' database."
echo "Restoring from: $(basename "${DB_BACKUP}")"
read -rp "Are you sure? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

# ---- Stop the app ----
echo ""
echo "===> Stopping trip-report service..."
systemctl stop trip-report

# ---- Restore database ----
echo "===> Dropping and recreating database..."
sudo -u postgres dropdb --if-exists "${DB_NAME}"
sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"

echo "===> Restoring database from backup..."
gunzip -c "${DB_BACKUP}" | sudo -u postgres psql -d "${DB_NAME}" -q

echo "===> Database restored successfully."

# ---- Restore uploads (if archive provided or found) ----
if [ $# -ge 2 ]; then
    UPLOADS_BACKUP="$2"
elif [ -f "${DB_BACKUP/trip_reports_/uploads_}" ]; then
    # Auto-match uploads archive from same timestamp
    UPLOADS_BACKUP="${DB_BACKUP/trip_reports_/uploads_}"
    UPLOADS_BACKUP="${UPLOADS_BACKUP/.sql.gz/.tar.gz}"
else
    UPLOADS_BACKUP=""
fi

if [ -n "${UPLOADS_BACKUP}" ] && [ -f "${UPLOADS_BACKUP}" ]; then
    echo "===> Restoring uploaded images..."
    rm -rf "${UPLOAD_DIR:?}"/*
    tar xzf "${UPLOADS_BACKUP}" -C "$(dirname "${UPLOAD_DIR}")"
    chown -R tripreport:tripreport "${UPLOAD_DIR}"
    echo "===> Uploads restored."
else
    echo "===> No uploads archive found, skipping image restore."
fi

# ---- Restart the app ----
echo "===> Starting trip-report service..."
systemctl start trip-report

echo ""
echo "Restore complete. App is running."
