import datetime
from sqlalchemy import String, Text, Date, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class TripReport(Base):
    __tablename__ = "trip_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer: Mapped[str] = mapped_column(String(255))
    ae: Mapped[str] = mapped_column(String(255))
    meeting_date: Mapped[datetime.date] = mapped_column(Date)
    topic: Mapped[str] = mapped_column(String(500))
    full_report_text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
