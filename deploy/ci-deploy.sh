#!/usr/bin/env bash
#
# CI deploy script — called by the GitHub Actions self-hosted runner
# Assumes setup.sh has already been run once (initial install)
#
set -euo pipefail

APP_DIR="/opt/trip-report"

WORKSPACE_DIR=$(pwd)

echo "===> Syncing backend"
rsync -a --delete \
  --exclude='venv/' \
  --exclude='uploads/' \
  --exclude='__pycache__/' \
  backend/ "${APP_DIR}/backend/"

echo "===> Installing Python dependencies (if changed)"
"${APP_DIR}/backend/venv/bin/pip" install -q -r "${APP_DIR}/backend/requirements.txt"

echo "===> Syncing frontend source"
rsync -a --delete \
  --exclude='node_modules/' \
  --exclude='dist/' \
  frontend/ "${APP_DIR}/frontend/"

echo "===> Installing npm packages (if changed)"
cd "${APP_DIR}/frontend"
npm ci

echo "===> Building frontend"
npm run build

echo "===> Updating deploy scripts"
cd "${WORKSPACE_DIR}"

rsync -a deploy/ "${APP_DIR}/deploy/"
chmod +x "${APP_DIR}/deploy/"*.sh

echo "===> Setting permissions"
chown -R tripreport:tripreport "${APP_DIR}/backend" "${APP_DIR}/frontend"
chown -R postgres:postgres "${APP_DIR}/backups" 2>/dev/null || true

echo "===> Restarting services"
systemctl restart trip-report
systemctl reload nginx

echo "===> Deploy complete at $(date)"
