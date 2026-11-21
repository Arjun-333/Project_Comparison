from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict

class SystemBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#3B82F6"
    icon: Optional[str] = None
    config: Optional[dict[str, Any]] = None

class SystemCreate(SystemBase):
    pass

class SystemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    config: Optional[dict[str, Any]] = None

class SystemResponse(SystemBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SystemDetailResponse(SystemResponse):
    total_runs: int = 0
    latest_run: Optional[dict[str, Any]] = None
