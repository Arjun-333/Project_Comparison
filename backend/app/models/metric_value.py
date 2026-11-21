from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
from sqlalchemy import Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.evaluation_run import EvaluationRun
    from app.models.metric_definition import MetricDefinition

class MetricValue(Base):
    __tablename__ = "metric_values"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(Integer, ForeignKey("evaluation_runs.id", ondelete="CASCADE"), index=True, nullable=False)
    metric_id: Mapped[int] = mapped_column(Integer, ForeignKey("metric_definitions.id", ondelete="CASCADE"), index=True, nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    previous_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    change: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    change_percent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    evaluation_run: Mapped["EvaluationRun"] = relationship("EvaluationRun", back_populates="metric_values")
    metric_definition: Mapped["MetricDefinition"] = relationship("MetricDefinition", back_populates="metric_values")
