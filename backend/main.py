import os
import re
import json
import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Trip Report API")

# CORS for local React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Reports root directory (OneDrive)
REPORTS_DIR = Path(os.getenv(
    "REPORTS_DIR",
    os.path.expanduser("~/OneDrive - Shi International Corp/trip_reports"),
))
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


# ---------- Schemas ----------

class ReportCreate(BaseModel):
    customer: str
    ae: str
    meeting_date: datetime.date
    topic: str
    full_report_text: str
    html_content: str
    district: str = ""
    meeting_type: str = ""
    meeting_format: str = ""
    crm_link: str = ""


class ReportOut(BaseModel):
    id: str
    customer: str
    ae: str
    meeting_date: datetime.date
    topic: str
    full_report_text: str
    created_at: datetime.datetime
    district: str = ""
    meeting_type: str = ""
    meeting_format: str = ""
    crm_link: str = ""


# ---------- Helpers ----------

def sanitize(name: str) -> str:
    """Make a string safe for use as a file/folder name."""
    s = re.sub(r'[<>:"/\\|?*]', '', name)
    s = s.strip('. ')
    return s or "Unknown"


def build_filename(date: datetime.date, customer: str, topic: str) -> str:
    """Build YYYY-MM-DD_customer_topic filename."""
    safe_customer = sanitize(customer).replace(' ', '-')
    safe_topic = sanitize(topic).replace(' ', '-')
    return f"{date.isoformat()}_{safe_customer}_{safe_topic}"


def load_metadata(json_path: Path) -> Optional[dict]:
    """Load a report's metadata JSON."""
    try:
        return json.loads(json_path.read_text(encoding="utf-8"))
    except Exception:
        return None


def scan_reports() -> list[dict]:
    """Scan the reports directory and return all report metadata."""
    reports = []
    if not REPORTS_DIR.exists():
        return reports
    for customer_dir in sorted(REPORTS_DIR.iterdir()):
        if not customer_dir.is_dir():
            continue
        for json_file in sorted(customer_dir.glob("*.json"), reverse=True):
            meta = load_metadata(json_file)
            if meta:
                reports.append(meta)
    reports.sort(key=lambda r: r.get("meeting_date", ""), reverse=True)
    return reports


# ---------- Routes ----------

@app.post("/api/reports", response_model=ReportOut, status_code=201)
async def save_report(payload: ReportCreate):
    try:
        # Create customer folder
        customer_folder = REPORTS_DIR / sanitize(payload.customer)
        customer_folder.mkdir(parents=True, exist_ok=True)

        # Build filename
        base_name = build_filename(payload.meeting_date, payload.customer, payload.topic)

        # Handle duplicates by appending a number
        html_path = customer_folder / f"{base_name}.html"
        json_path = customer_folder / f"{base_name}.json"
        counter = 1
        while html_path.exists() or json_path.exists():
            counter += 1
            html_path = customer_folder / f"{base_name}_{counter}.html"
            json_path = customer_folder / f"{base_name}_{counter}.json"

        # The report ID is the relative path (without extension)
        report_id = str(html_path.relative_to(REPORTS_DIR).with_suffix(""))

        now = datetime.datetime.now().isoformat()

        # Save HTML file
        html_path.write_text(payload.html_content, encoding="utf-8")

        # Save metadata JSON
        metadata = {
            "id": report_id,
            "customer": payload.customer,
            "ae": payload.ae,
            "meeting_date": payload.meeting_date.isoformat(),
            "topic": payload.topic,
            "full_report_text": payload.full_report_text,
            "district": payload.district,
            "meeting_type": payload.meeting_type,
            "meeting_format": payload.meeting_format,
            "crm_link": payload.crm_link,
            "created_at": now,
        }
        json_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

        return ReportOut(**{**metadata, "meeting_date": payload.meeting_date, "created_at": now})

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to save report: {e}")


@app.get("/api/reports", response_model=list[ReportOut])
async def search_reports(
    customer: Optional[str] = Query(None),
    ae: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    date_from: Optional[datetime.date] = Query(None),
    date_to: Optional[datetime.date] = Query(None),
    q: Optional[str] = Query(None, description="Free-text search across all fields"),
):
    all_reports = scan_reports()
    results = []

    for meta in all_reports:
        if customer and customer.lower() not in meta.get("customer", "").lower():
            continue
        if ae and ae.lower() not in meta.get("ae", "").lower():
            continue
        if topic and topic.lower() not in meta.get("topic", "").lower():
            continue

        report_date = meta.get("meeting_date", "")
        if date_from and report_date < date_from.isoformat():
            continue
        if date_to and report_date > date_to.isoformat():
            continue

        if q:
            q_lower = q.lower()
            searchable = " ".join([
                meta.get("customer", ""),
                meta.get("ae", ""),
                meta.get("topic", ""),
                meta.get("full_report_text", ""),
                meta.get("district", ""),
            ]).lower()
            if q_lower not in searchable:
                continue

        results.append(ReportOut(**meta))

    return results


@app.get("/api/reports/{report_id:path}", response_model=ReportOut)
async def get_report(report_id: str):
    json_path = REPORTS_DIR / f"{report_id}.json"
    if not json_path.exists():
        raise HTTPException(404, "Report not found")
    meta = load_metadata(json_path)
    if not meta:
        raise HTTPException(500, "Could not read report metadata")
    return ReportOut(**meta)


@app.delete("/api/reports/{report_id:path}", status_code=204)
async def delete_report(report_id: str):
    json_path = REPORTS_DIR / f"{report_id}.json"
    html_path = REPORTS_DIR / f"{report_id}.html"

    if not json_path.exists() and not html_path.exists():
        raise HTTPException(404, "Report not found")

    if json_path.exists():
        json_path.unlink()
    if html_path.exists():
        html_path.unlink()

    # Remove customer folder if empty
    parent = json_path.parent
    if parent != REPORTS_DIR and parent.exists() and not any(parent.iterdir()):
        parent.rmdir()
