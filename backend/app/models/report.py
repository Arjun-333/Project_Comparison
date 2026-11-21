from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy import Integer, String, Text, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    executive_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    selected_systems: Mapped[list[int]] = mapped_column(JSON, default=list, nullable=False)  # list of system IDs
    selected_runs: Mapped[Optional[list[int]]] = mapped_column(JSON, nullable=True)  # list of run IDs
    selected_metrics: Mapped[Optional[list[int]]] = mapped_column(JSON, nullable=True)  # list of metric definition IDs
    sections: Mapped[Optional[list[dict[str, Any]]]] = mapped_column(JSON, nullable=True)  # ordered list of report sections
    methodology_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    limitations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    conclusions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    findings: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)  # draft, final
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
