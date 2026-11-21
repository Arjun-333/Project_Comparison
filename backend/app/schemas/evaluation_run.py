from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict
from app.schemas.system import SystemResponse
from app.schemas.metric_value import MetricValueResponse

class EvaluationRunBase(BaseModel):
    system_id: int
    run_id: Optional[str] = None
    evaluation_date: Optional[datetime] = None
    model_name: Optional[str] = None
    dataset_name: Optional[str] = None
    methodology: Optional[str] = None
    test_case_count: Optional[int] = None
    status: str = "completed"
    notes: Optional[str] = None
    metadata_json: Optional[dict[str, Any]] = None

class EvaluationRunCreate(EvaluationRunBase):
    pass

class EvaluationRunUpdate(BaseModel):
    model_name: Optional[str] = None
    dataset_name: Optional[str] = None
    methodology: Optional[str] = None
    test_case_count: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    metadata_json: Optional[dict[str, Any]] = None
    evaluation_date: Optional[datetime] = None

class EvaluationRunResponse(BaseModel):
    id: int
    run_id: str
    system_id: int
    evaluation_date: datetime
    model_name: Optional[str] = None
    dataset_name: Optional[str] = None
    methodology: Optional[str] = None
    test_case_count: Optional[int] = None
    status: str
    notes: Optional[str] = None
    metadata_json: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    system: Optional[SystemResponse] = None

    model_config = ConfigDict(from_attributes=True)

class EvaluationRunDetailResponse(EvaluationRunResponse):
    metric_values: list[MetricValueResponse] = []
