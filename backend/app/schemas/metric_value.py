from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.metric import MetricDefinitionResponse

class MetricValueBase(BaseModel):
    metric_id: int
    value: float
    previous_value: Optional[float] = None
    change: Optional[float] = None
    change_percent: Optional[float] = None
    notes: Optional[str] = None

class MetricValueCreate(MetricValueBase):
    pass

class MetricValueItemCreate(BaseModel):
    metric_id: int | str  # can accept ID int or metric_id string like "M1" or "ret_latency"
    value: float
    previous_value: Optional[float] = None
    change: Optional[float] = None
    change_percent: Optional[float] = None
    notes: Optional[str] = None

class MetricValueBatchCreate(BaseModel):
    values: list[MetricValueItemCreate]

class MetricValueUpdate(BaseModel):
    value: Optional[float] = None
    previous_value: Optional[float] = None
    change: Optional[float] = None
    change_percent: Optional[float] = None
    notes: Optional[str] = None

class MetricValueResponse(MetricValueBase):
    id: int
    run_id: int
    created_at: datetime
    metric_definition: Optional[MetricDefinitionResponse] = None

    model_config = ConfigDict(from_attributes=True)
