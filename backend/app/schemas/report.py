from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict

class ReportBase(BaseModel):
    title: str
    executive_summary: Optional[str] = None
    selected_systems: list[int] = []
    selected_runs: Optional[list[int]] = None
    selected_metrics: Optional[list[int]] = None
    sections: Optional[list[dict[str, Any]]] = None
    methodology_notes: Optional[str] = None
    limitations: Optional[str] = None
    conclusions: Optional[str] = None
    findings: Optional[str] = None
    status: str = "draft"

class ReportCreate(ReportBase):
    pass

class ReportUpdate(BaseModel):
    title: Optional[str] = None
    executive_summary: Optional[str] = None
    selected_systems: Optional[list[int]] = None
    selected_runs: Optional[list[int]] = None
    selected_metrics: Optional[list[int]] = None
    sections: Optional[list[dict[str, Any]]] = None
    methodology_notes: Optional[str] = None
    limitations: Optional[str] = None
    conclusions: Optional[str] = None
    findings: Optional[str] = None
    status: Optional[str] = None

class ReportResponse(ReportBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
