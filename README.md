# Trip Report Generator

Manual data-entry web app for generating formatted Trip Reports. Reports are saved as HTML files to your OneDrive, organized by customer folder.

## Architecture

```
trip_report/
├── Dockerfile                 # Docker build (single image, frontend + backend)
├── .dockerignore
├── backend/
│   ├── main.py                # FastAPI routes + file-based storage
│   └── requirements.txt       # Python deps
├── frontend/
│   ├── package.json
│   ├── vite.config.js         # Dev proxy to backend
│   └── src/
│       ├── App.jsx            # Tab navigation
│       ├── App.css            # All styling
│       └── components/
│           ├── TripReportForm.jsx   # Data entry + HTML compiler
│           └── SearchReports.jsx    # Search/filter history
└── .github/
    └── workflows/
        └── deploy.yml         # GitHub Actions workflow (server deploy)
```

## Quick Start (Docker)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- OneDrive syncing on your machine

### Build the image

```bash
cd trip_report
docker build -t tripreport .
```

### Run

**Mac:**
```bash
docker run -d -p 8000:8000 \
  -v "$HOME/OneDrive - Shi International Corp/trip_reports:/data" \
  -e REPORTS_DIR=/data \
  --name tripreport tripreport
```

**Windows (PowerShell):**
```powershell
docker run -d -p 8000:8000 `
  -v "$env:USERPROFILE/OneDrive - Shi International Corp/trip_reports:/data" `
  -e REPORTS_DIR=/data `
  --name tripreport tripreport
```

**Windows (Command Prompt):**
```cmd
docker run -d -p 8000:8000 -v "%USERPROFILE%\OneDrive - Shi International Corp\trip_reports:/data" -e REPORTS_DIR=/data --name tripreport tripreport
```

Then open **http://localhost:8000**

### Stop / Start / Remove

```bash
# Stop the app
docker stop tripreport

# Start it again
docker start tripreport

# Remove the container (reports in OneDrive are not affected)
docker rm tripreport
```

## How Storage Works

```
OneDrive - Shi International Corp/
└── trip_reports/
    ├── Acme-Corp/
    │   ├── 2026-03-15_Acme-Corp_Discovery-Call.html
    │   └── 2026-03-27_Acme-Corp_QBR-Review.html
    ├── Contoso/
    │   └── 2026-03-20_Contoso_POC-Demo.html
    └── Fabrikam/
        └── 2026-03-22_Fabrikam_Technical-Deep-Dive.html
```

- Each customer gets their own folder (created automatically)
- Reports are named `YYYY-MM-DD_Customer_Topic.html`
- Files sync to OneDrive automatically
- Metadata is embedded in the HTML file (invisible in browser, used for search)
- Deleting a report from the app removes the file; deleting the last report removes the customer folder

## API Endpoints

| Method | Route                | Description             |
|--------|----------------------|-------------------------|
| POST   | `/api/reports`       | Save a new report       |
| GET    | `/api/reports`       | Search/filter reports   |
| GET    | `/api/reports/{id}`  | Get a single report     |
| DELETE | `/api/reports/{id}`  | Delete a report         |

### Search query params

- `customer` — partial match
- `ae` — partial match
- `topic` — partial match
- `date_from` / `date_to` — date range
- `q` — free-text search across all fields

## Usage

1. Open **http://localhost:8000**
2. Fill in meeting metadata, add Opps and Action Items, toggle Attendee sections
3. Click **Generate Trip Report** to compile into formatted HTML
4. **Copy for Email** to paste formatted into Outlook/Gmail
5. **Save to Database** to write the HTML file to your OneDrive
6. Use the **Search Reports** tab to find past reports by customer, AE, date, or topic

## Local Development (without Docker)

```bash
# Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

Vite dev server at `http://localhost:5173` proxies `/api` to the backend automatically.

## Server Deployment (Ubuntu)

The `deploy/` directory and `main` branch contain the original server-based deployment with PostgreSQL, Nginx, systemd services, backup/restore, and CI/CD via self-hosted GitHub Actions runner. See the `main` branch README for those instructions.
