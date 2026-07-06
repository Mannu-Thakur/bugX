"""Problem, Tag, and Admin schemas for Phase 3."""
import uuid
import re
from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# ── Tag schemas ───────────────────────────────────────────────────────────────

class TagResponse(BaseModel):
    id: uuid.UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


# ── Template schemas ──────────────────────────────────────────────────────────

class TemplateCreate(BaseModel):
    language: str = Field(..., pattern="^(python|javascript|cpp|java)$")
    template_code: str = Field(..., min_length=1)
    function_name: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-zA-Z_][a-zA-Z0-9_]*$")
    arg_style: str = Field(..., pattern="^(kwargs|positional|single)$")

    @field_validator("arg_style")
    @classmethod
    def validate_kwargs_not_for_js(cls, v: str, info: Any) -> str:
        # Full cross-field validation happens at problem creation level
        return v


class TemplateResponse(BaseModel):
    id: uuid.UUID
    language: str
    template_code: str
    function_name: str
    arg_style: str

    model_config = ConfigDict(from_attributes=True)


# ── TestCase schemas ──────────────────────────────────────────────────────────

class TestCaseCreate(BaseModel):
    input: str
    expected_output: str
    is_sample: bool = False
    order_index: int = Field(..., ge=0)
    weight: int = Field(1, ge=1)


class TestCaseResponse(BaseModel):
    id: uuid.UUID
    is_sample: bool
    order_index: int
    weight: int
    # Input/expected only exposed on sample cases (enforced in controller)
    input: Optional[str] = None
    expected_output: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ── Problem schemas ───────────────────────────────────────────────────────────

class ProblemCreate(BaseModel):
    slug: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    difficulty: str = Field(..., pattern="^(EASY|MEDIUM|HARD)$")
    time_limit_ms: int = Field(2000, gt=0)
    memory_limit_kb: int = Field(262144, gt=0)
    score_base: int = Field(100, gt=0)
    runtime_bonus_max: int = Field(20, ge=0)
    expected_complexity: Optional[str] = Field(None, max_length=20)
    comparison_mode: str = Field("strict", pattern="^(strict|order_agnostic)$")
    tag_ids: List[uuid.UUID] = Field(default_factory=list)
    templates: List[TemplateCreate] = Field(..., min_length=1)
    test_cases: List[TestCaseCreate] = Field(..., min_length=1)

    @field_validator("templates")
    @classmethod
    def validate_templates(cls, v: List[TemplateCreate]) -> List[TemplateCreate]:
        for t in v:
            if t.language == "javascript" and t.arg_style == "kwargs":
                raise ValueError("javascript templates cannot use arg_style='kwargs'")
        return v

    @field_validator("test_cases")
    @classmethod
    def validate_test_cases(cls, v: List[TestCaseCreate]) -> List[TestCaseCreate]:
        samples = [tc for tc in v if tc.is_sample]
        hidden = [tc for tc in v if not tc.is_sample]
        if len(samples) < 1:
            raise ValueError("At least 1 sample test case required")
        if len(hidden) < 3:
            raise ValueError("At least 3 hidden test cases required")
        # Unique order_index
        indices = [tc.order_index for tc in v]
        if len(indices) != len(set(indices)):
            raise ValueError("order_index must be unique across all test cases")
        return v


class ProblemUpdate(BaseModel):
    """Admin can update non-structural fields only."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1)
    difficulty: Optional[str] = Field(None, pattern="^(EASY|MEDIUM|HARD)$")
    time_limit_ms: Optional[int] = Field(None, gt=0)
    memory_limit_kb: Optional[int] = Field(None, gt=0)
    score_base: Optional[int] = Field(None, gt=0)
    runtime_bonus_max: Optional[int] = Field(None, ge=0)
    expected_complexity: Optional[str] = Field(None, max_length=20)
    comparison_mode: Optional[str] = Field(None, pattern="^(strict|order_agnostic)$")
    is_published: Optional[bool] = None
    tag_ids: Optional[List[uuid.UUID]] = None


class UserStatusEmbed(BaseModel):
    solved: bool
    best_score: Optional[int] = None


class ProblemListItem(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    difficulty: str
    acceptance_rate: Optional[float] = None
    tags: List[TagResponse] = []
    score_base: int
    user_status: Optional[UserStatusEmbed] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def adjust_score_base(self) -> "ProblemListItem":
        mapping = {"EASY": 3, "MEDIUM": 6, "HARD": 10}
        diff_str = self.difficulty.value if hasattr(self.difficulty, "value") else str(self.difficulty)
        self.score_base = mapping.get(diff_str.upper(), 3)
        return self


class ProblemDetail(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    description: str
    difficulty: str
    time_limit_ms: int
    memory_limit_kb: int
    score_base: int
    runtime_bonus_max: int
    expected_complexity: Optional[str] = None
    acceptance_rate: Optional[float] = None
    tags: List[TagResponse] = []
    templates: List[TemplateResponse] = []
    # Sample test cases only for public view; hidden test I/O never exposed
    sample_test_cases: List[TestCaseResponse] = []
    user_status: Optional[UserStatusEmbed] = None
    hints: List[str] = []
    comparison_mode: str = "strict"
    source: Optional[str] = "local"
    external_problem_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def adjust_score_base(self) -> "ProblemDetail":
        mapping = {"EASY": 3, "MEDIUM": 6, "HARD": 10}
        diff_str = self.difficulty.value if hasattr(self.difficulty, "value") else str(self.difficulty)
        self.score_base = mapping.get(diff_str.upper(), 3)
        return self


class PaginatedProblems(BaseModel):
    items: List[ProblemListItem]
    total: int
    page: int
    limit: int
    pages: int


class BestSubmissionResponse(BaseModel):
    id: uuid.UUID
    status: str
    score: int
    runtime_ms: Optional[int] = None
    passed_count: int
    total_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LastSubmissionResponse(BaseModel):
    id: uuid.UUID
    language: str
    source_code: str
    status: str
    score: int
    runtime_ms: Optional[int] = None
    passed_count: int
    total_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
