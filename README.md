# Trip Report Generator

Manual data-entry web app for generating formatted Trip Reports for CRM copy/paste.

## Architecture

```
trip_report/
├── schema.sql                 # PostgreSQL table DDL
├── backend/
│   ├── main.py                # FastAPI routes
│   ├── models.py              # SQLAlchemy model
│   ├── database.py            # Async DB connection
│   ├── requirements.txt       # Python deps
│   └── uploads/               # Uploaded images
├── frontend/
│   ├── package.json
│   ├── vite.config.js          # Dev proxy to backend
│   └── src/
│       ├── App.jsx             # Tab navigation
│       ├── App.css             # All styling
│       └── components/
│           ├── TripReportForm.jsx   # Data entry + text compiler
│           └── SearchReports.jsx    # Search/filter history
└── deploy/
    ├── setup.sh                    # One-shot Ubuntu deployment script
    ├── trip-report.service         # systemd unit (app)
    ├── trip-report-backup.service  # systemd unit (backup oneshot)
    ├── trip-report-backup.timer    # systemd timer (nightly 2 AM)
    ├── backup.sh                   # pg_dump + image tar + rotation
    ├── restore.sh                  # Interactive restore from backup
    ├── tripreport.nginx.conf       # Nginx reverse proxy config
    └── .env.example                # Environment variable template
```

## Production Deployment (Ubuntu)

Target: Ubuntu 22.04+ or 24.04 LTS (bare metal, VM, or Proxmox LXC).

### Quick deploy

```bash
# Copy the project to the server
scp -r trip_report/ user@your-server:/tmp/trip_report

# SSH in and run setup
ssh user@your-server
cd /tmp/trip_report
chmod +x deploy/setup.sh
sudo ./deploy/setup.sh
```

The script installs all dependencies, creates the DB, builds the frontend, and starts services.

### Post-install (required)

```bash
# 1. Set a real database password
sudo -u postgres psql -c "ALTER USER tripreport WITH PASSWORD 'your_secure_password';"

# 2. Update the env file to match
sudo nano /opt/trip-report/.env
# Change: DATABASE_URL=postgresql+asyncpg://tripreport:your_secure_password@localhost:5432/trip_reports

# 3. Restart
sudo systemctl restart trip-report
```

### What the deploy script creates

| Component | Detail |
|---|---|
| System user | `tripreport` (no-login, runs the API) |
| App location | `/opt/trip-report/` |
| PostgreSQL | DB `trip_reports`, user `tripreport` |
| FastAPI | systemd service `trip-report`, port 8000 (localhost only) |
| Nginx | Reverse proxy on port 80, serves React build + proxies `/api` |
| Uploads | `/opt/trip-report/backend/uploads/`, served by Nginx |
| Backups | Nightly at 2 AM, 30-day retention, `/opt/trip-report/backups/` |

### Management commands

```bash
# Service status
sudo systemctl status trip-report

# View logs
sudo journalctl -u trip-report -f

# Restart after config changes
sudo systemctl restart trip-report

# Redeploy frontend only
cd /opt/trip-report/frontend && npm run build && sudo systemctl reload nginx

# Add HTTPS (optional)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx
```

## Backup & Restore

Automated nightly backups are installed by the deploy script. Both the PostgreSQL database and uploaded images are backed up.

### How it works

- **Schedule:** Every night at 2:00 AM (systemd timer)
- **Retention:** 30 days, older backups auto-deleted
- **Location:** `/opt/trip-report/backups/`
- **Contents:** `trip_reports_YYYY-MM-DD.sql.gz` (database) + `uploads_YYYY-MM-DD.tar.gz` (images)

### Backup commands

```bash
# Check backup timer status
systemctl list-timers trip-report-backup.timer

# Run a manual backup now
sudo -u postgres /opt/trip-report/deploy/backup.sh

# View backup logs
sudo journalctl -u trip-report-backup.service

# List all backups
ls -lh /opt/trip-report/backups/
```

### Restore from backup

```bash
# Interactive — lists backups and lets you pick one
sudo /opt/trip-report/deploy/restore.sh

# Direct — specify the backup file
sudo /opt/trip-report/deploy/restore.sh /opt/trip-report/backups/trip_reports_2026-03-25_020000.sql.gz
```

The restore script will:
1. Stop the app
2. Drop and recreate the database from the backup
3. Restore uploaded images (auto-matches the same timestamp)
4. Restart the app

### Offsite backup (recommended)

Local backups protect against accidental deletion. For hardware failure protection, sync offsite:

```bash
# Example: rsync to a NAS or second server (add to crontab after backup runs)
30 2 * * * rsync -az /opt/trip-report/backups/ user@nas:/backups/trip-report/

# Example: sync to S3-compatible storage
30 2 * * * aws s3 sync /opt/trip-report/backups/ s3://your-bucket/trip-report-backups/
```

## Production Architecture

```
Browser ──► Nginx :80/443
              ├── /           → React static build (dist/)
              ├── /api/*      → proxy_pass → uvicorn :8000
              └── /uploads/*  → static files (alias)
```

## API Endpoints

| Method | Route                | Description             |
|--------|----------------------|-------------------------|
| POST   | `/api/reports`       | Save a compiled report  |
| GET    | `/api/reports`       | Search/filter reports   |
| GET    | `/api/reports/{id}`  | Get a single report     |
| POST   | `/api/upload-image`  | Upload participants img |

### Search query params

- `customer` - partial match
- `ae` - partial match
- `topic` - partial match
- `date_from` / `date_to` - date range
- `q` - free-text search across all fields

## Usage

1. Open `http://<your-server-ip>`
2. Fill in meeting metadata, upload participant image, add Opps and Action Items
3. Click **Generate Trip Report** to compile everything into formatted text
4. **Copy to Clipboard** for CRM paste, and/or **Save to Database** for history
5. Use the **Search Reports** tab to find past reports by customer, AE, date, or topic

## Local Development

For local dev work, you can still run the Vite dev server + uvicorn directly:

```bash
# Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

Vite dev server at `http://localhost:5173` proxies `/api` to the backend automatically.
