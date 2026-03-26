#!/usr/bin/env bash
#
# Trip Report — Ubuntu single-host deployment script
# Run as root or with sudo on a fresh Ubuntu 22.04+ / 24.04 LTS
#
set -euo pipefail

APP_DIR="/opt/trip-report"
DB_NAME="trip_reports"
DB_USER="tripreport"
SYSTEM_USER="tripreport"

echo "===> Installing system packages"
apt-get update
apt-get install -y \
    nginx \
    postgresql \
    python3 python3-venv python3-pip \
    nodejs npm \
    git

# ---- System user ----
echo "===> Creating system user: ${SYSTEM_USER}"
if ! id "${SYSTEM_USER}" &>/dev/null; then
    useradd --system --shell /usr/sbin/nologin --home-dir "${APP_DIR}" "${SYSTEM_USER}"
fi

# ---- Copy project files ----
echo "===> Deploying app to ${APP_DIR}"
mkdir -p "${APP_DIR}"
# Assumes this script is run from the project root (trip_report/)
cp -r backend "${APP_DIR}/"
cp -r frontend "${APP_DIR}/"
cp deploy/.env.example "${APP_DIR}/.env"

# ---- PostgreSQL setup ----
echo "===> Configuring PostgreSQL"
systemctl enable --now postgresql

# Create DB user and database (idempotent)
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" \
    | grep -q 1 || sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD 'CHANGE_ME';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" \
    | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

sudo -u postgres psql -d "${DB_NAME}" -f "${APP_DIR}/backend/../schema.sql" 2>/dev/null || true

echo ""
echo "*** IMPORTANT: Edit ${APP_DIR}/.env and change the database password! ***"
echo "*** Then run:  sudo -u postgres psql -c \"ALTER USER ${DB_USER} WITH PASSWORD 'your_real_password';\" ***"
echo ""

# ---- Python backend ----
echo "===> Setting up Python virtualenv"
python3 -m venv "${APP_DIR}/backend/venv"
"${APP_DIR}/backend/venv/bin/pip" install --upgrade pip
"${APP_DIR}/backend/venv/bin/pip" install -r "${APP_DIR}/backend/requirements.txt"

# ---- Frontend build ----
echo "===> Building React frontend"
cd "${APP_DIR}/frontend"
npm install
npm run build
cd -

# ---- File permissions ----
echo "===> Setting permissions"
chown -R "${SYSTEM_USER}:${SYSTEM_USER}" "${APP_DIR}"
chmod 600 "${APP_DIR}/.env"
mkdir -p "${APP_DIR}/backend/uploads"
chown "${SYSTEM_USER}:${SYSTEM_USER}" "${APP_DIR}/backend/uploads"

# ---- systemd service ----
echo "===> Installing systemd service"
cp deploy/trip-report.service /etc/systemd/system/trip-report.service
systemctl daemon-reload
systemctl enable --now trip-report.service

# ---- Backup setup ----
echo "===> Setting up nightly backups"
mkdir -p "${APP_DIR}/backups"
chown postgres:postgres "${APP_DIR}/backups"
cp deploy/backup.sh "${APP_DIR}/deploy/backup.sh"
chmod +x "${APP_DIR}/deploy/backup.sh"
cp deploy/restore.sh "${APP_DIR}/deploy/restore.sh"
chmod +x "${APP_DIR}/deploy/restore.sh"
cp deploy/trip-report-backup.service /etc/systemd/system/
cp deploy/trip-report-backup.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now trip-report-backup.timer

# ---- Nginx ----
echo "===> Configuring Nginx"
cp deploy/tripreport.nginx.conf /etc/nginx/sites-available/trip-report
ln -sf /etc/nginx/sites-available/trip-report /etc/nginx/sites-enabled/trip-report
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo ""
echo "===> Deployment complete!"
echo "    App:  http://$(hostname -I | awk '{print $1}')"
echo "    API:  http://$(hostname -I | awk '{print $1}')/api/docs"
echo ""
echo "Next steps:"
echo "  1. Edit ${APP_DIR}/.env — set a real database password"
echo "  2. Update the PostgreSQL user password to match"
echo "  3. Restart the service: systemctl restart trip-report"
echo "  4. (Optional) Add HTTPS with: apt install certbot python3-certbot-nginx && certbot --nginx"
echo ""
echo "Backups:"
echo "  - Nightly at 2:00 AM to ${APP_DIR}/backups/"
echo "  - 30-day retention (auto-rotated)"
echo "  - Manual backup: sudo -u postgres ${APP_DIR}/deploy/backup.sh"
echo "  - Restore:       sudo ${APP_DIR}/deploy/restore.sh"
echo "  - Check timer:   systemctl list-timers trip-report-backup.timer"
