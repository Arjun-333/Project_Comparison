from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional, Any
from sqlalchemy import Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.system import System
    from app.models.metric_value import MetricValue
    from app.models.test_case import TestCase

class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    system_id: Mapped[int] = mapped_column(Integer, ForeignKey("systems.id", ondelete="CASCADE"), index=True, nullable=False)
    evaluation_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    model_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    dataset_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    methodology: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    test_case_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="completed", nullable=False)  # completed, in_progress, failed
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
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

    # Relationships
    system: Mapped["System"] = relationship("System", back_populates="runs")
    metric_values: Mapped[list["MetricValue"]] = relationship(
        "MetricValue",
        back_populates="evaluation_run",
        cascade="all, delete-orphan"
    )
    test_cases: Mapped[list["TestCase"]] = relationship(
        "TestCase",
        back_populates="evaluation_run",
        cascade="all, delete-orphan"
    )
