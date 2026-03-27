#!/usr/bin/env bash
#
# CI deploy script — called by the GitHub Actions self-hosted runner
# Assumes setup.sh has already been run once (initial install)
#
set -euo pipefail

APP_DIR="/opt/trip-report"

WORKSPACE_DIR=$(pwd)

echo "===> Syncing backend"
sudo rsync -a --delete \
  --exclude='venv/' \
  --exclude='uploads/' \
  --exclude='__pycache__/' \
  --exclude='.env' \
  backend/ "${APP_DIR}/backend/"

echo "===> Installing Python dependencies (if changed)"
sudo "${APP_DIR}/backend/venv/bin/pip" install -q -r "${APP_DIR}/backend/requirements.txt"

echo "===> Syncing frontend source"
sudo rsync -a --delete \
  --exclude='node_modules/' \
  --exclude='dist/' \
  frontend/ "${APP_DIR}/frontend/"

echo "===> Installing npm packages (if changed)"
cd "${APP_DIR}/frontend"
sudo npm ci

echo "===> Building frontend"
sudo npm run build

echo "===> Updating deploy scripts"
cd "${WORKSPACE_DIR}"

sudo rsync -a deploy/ "${APP_DIR}/deploy/"
sudo chmod +x "${APP_DIR}/deploy/"*.sh

echo "===> Setting permissions"
sudo chown -R tripreport:tripreport "${APP_DIR}/backend" "${APP_DIR}/frontend"
sudo chown -R postgres:postgres "${APP_DIR}/backups" 2>/dev/null || true

echo "===> Restarting services"
sudo systemctl restart trip-report
sudo systemctl reload nginx

echo "===> Deploy complete at $(date)"
