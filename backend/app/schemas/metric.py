from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class MetricDefinitionBase(BaseModel):
    metric_id: str
    name: str
    category: str
    unit: str
    scale_min: Optional[float] = None
    scale_max: Optional[float] = None
    direction: str = "higher"
    description: Optional[str] = None
    calculation: Optional[str] = None
    interpretation: Optional[str] = None
    limitations: Optional[str] = None
    is_comparable: bool = True

class MetricDefinitionCreate(MetricDefinitionBase):
    pass

class MetricDefinitionUpdate(BaseModel):
    metric_id: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    scale_min: Optional[float] = None
    scale_max: Optional[float] = None
    direction: Optional[str] = None
    description: Optional[str] = None
    calculation: Optional[str] = None
    interpretation: Optional[str] = None
    limitations: Optional[str] = None
    is_comparable: Optional[bool] = None

class MetricDefinitionResponse(MetricDefinitionBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
