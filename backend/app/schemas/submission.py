from typing import List, Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, validator
from app.models.submission import SubmissionStatus

class SubmissionCreate(BaseModel):
    problem_id: UUID
    language: str
    source_code: str = Field(..., max_length=65536)
    run_samples_only: bool = False

    @validator('language')
    def validate_language(cls, v):
        allowed = {"python", "javascript"}
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
    runtime_ms: Optional[int]
    memory_kb: Optional[int]
    error_message: Optional[str]
    run_samples_only: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

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

    class Config:
        from_attributes = True
