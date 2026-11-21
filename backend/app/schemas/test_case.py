from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict

class TestCaseBase(BaseModel):
    run_id: int
    case_id: str
    category: Optional[str] = None
    question: str
    expected_answer: Optional[str] = None
    generated_answer: Optional[str] = None
    context_used: Optional[str] = None
    scores: Optional[dict[str, Any]] = None
    evaluator_feedback: Optional[str] = None

class TestCaseCreate(TestCaseBase):
    pass

class TestCaseUpdate(BaseModel):
    category: Optional[str] = None
    question: Optional[str] = None
    expected_answer: Optional[str] = None
    generated_answer: Optional[str] = None
    context_used: Optional[str] = None
    scores: Optional[dict[str, Any]] = None
    evaluator_feedback: Optional[str] = None

class TestCaseResponse(TestCaseBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TestCaseCompareItem(BaseModel):
    case_id: str
    question: str
    category: Optional[str] = None
    system_results: dict[str, Any]  # system_name -> {run_id, generated_answer, scores, feedback}
