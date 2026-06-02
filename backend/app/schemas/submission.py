from typing import List, Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
from app.models.submission import SubmissionStatus

class SubmissionCreate(BaseModel):
    problem_id: UUID
    language: str
    source_code: str = Field(..., max_length=65536)
    run_samples_only: bool = False

    @field_validator('language')
    @classmethod
    def validate_language(cls, v: str) -> str:
        allowed = {"python", "javascript", "cpp", "java"}
        if v.lower() not in allowed:
            raise ValueError(f"Language must be one of {allowed}")
        return v.lower()

class SubmissionResponse(BaseModel):
    id: UUID
    user_id: UUID
    problem_id: UUID
    language: str
    status: SubmissionStatus
    passed_count: int
    total_count: int
    passed_weight: int
    total_weight: int
    score: int
    runtime_ms: Optional[int] = None
    memory_kb: Optional[int] = None
    error_message: Optional[str] = None
    source_code: str
    run_samples_only: bool
    problem_slug: Optional[str] = None
    problem_title: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class SubmissionResultResponse(BaseModel):
    id: UUID
    test_case_id: UUID
    passed: bool
    runtime_ms: int
    memory_kb: int
    # Only include input/expected for samples (app logic will filter this)
    test_case_input: Optional[str] = None
    expected_output: Optional[str] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    is_sample: Optional[bool] = None
    is_first_failing_hidden: Optional[bool] = None

    model_config = {"from_attributes": True}
