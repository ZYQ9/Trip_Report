import os
import uuid
import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from database import engine, Base, get_db
from models import TripReport

app = FastAPI(title="Trip Report API")

# CORS for local React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploads directory
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


# ---------- Schemas ----------

class ReportCreate(BaseModel):
    customer: str
    ae: str
    meeting_date: datetime.date
    topic: str
    full_report_text: str


class ReportOut(BaseModel):
    id: int
    customer: str
    ae: str
    meeting_date: datetime.date
    topic: str
    full_report_text: str
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class ImageOut(BaseModel):
    filename: str
    url: str


# ---------- Lifecycle ----------

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)


# ---------- Routes ----------

@app.post("/api/reports", response_model=ReportOut, status_code=201)
async def save_report(payload: ReportCreate, db: AsyncSession = Depends(get_db)):
    try:
        report = TripReport(
            customer=payload.customer,
            ae=payload.ae,
            meeting_date=payload.meeting_date,
            topic=payload.topic,
            full_report_text=payload.full_report_text,
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)
        return report
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to save report: {e}")


@app.post("/api/upload-image", response_model=ImageOut)
async def upload_image(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext not in {".png", ".jpg", ".jpeg", ".gif", ".webp"}:
        raise HTTPException(400, "Only image files are allowed.")
    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / unique_name
    contents = await file.read()
    dest.write_bytes(contents)
    return ImageOut(filename=unique_name, url=f"/uploads/{unique_name}")


@app.get("/api/reports", response_model=list[ReportOut])
async def search_reports(
    customer: Optional[str] = Query(None),
    ae: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    date_from: Optional[datetime.date] = Query(None),
    date_to: Optional[datetime.date] = Query(None),
    q: Optional[str] = Query(None, description="Free-text search across all fields"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(TripReport)

    if customer:
        stmt = stmt.where(TripReport.customer.ilike(f"%{customer}%"))
    if ae:
        stmt = stmt.where(TripReport.ae.ilike(f"%{ae}%"))
    if topic:
        stmt = stmt.where(TripReport.topic.ilike(f"%{topic}%"))
    if date_from:
        stmt = stmt.where(TripReport.meeting_date >= date_from)
    if date_to:
        stmt = stmt.where(TripReport.meeting_date <= date_to)
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                TripReport.customer.ilike(pattern),
                TripReport.ae.ilike(pattern),
                TripReport.topic.ilike(pattern),
                TripReport.full_report_text.ilike(pattern),
            )
        )

    stmt = stmt.order_by(TripReport.meeting_date.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@app.get("/api/reports/{report_id}", response_model=ReportOut)
async def get_report(report_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TripReport).where(TripReport.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    return report


@app.delete("/api/reports/{report_id}", status_code=204)
async def delete_report(report_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TripReport).where(TripReport.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    await db.delete(report)
    await db.commit()
