import uuid
from typing import List, Optional, Dict
from pydantic import BaseModel, ConfigDict
from app.schemas.problem import ProblemListItem

class CompanyListItem(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    logo_light: Optional[str] = None
    logo_dark: Optional[str] = None
    brand_color: Optional[str] = None
    totalProblems: int
    easyCount: int
    mediumCount: int
    hardCount: int

    model_config = ConfigDict(from_attributes=True)

class CompanyDetail(BaseModel):
    name: str
    slug: str
    logo_light: Optional[str] = None
    logo_dark: Optional[str] = None
    brand_color: Optional[str] = None

class PaginatedProblems(BaseModel):
    items: List[ProblemListItem]
    total: int
    page: int
    limit: int
    pages: int

class CompanyResponse(BaseModel):
    company: CompanyDetail
    problems: PaginatedProblems
    stats: dict

class TopicListItem(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    totalProblems: int
    easyCount: int
    mediumCount: int
    hardCount: int

    model_config = ConfigDict(from_attributes=True)

class TopicDetail(BaseModel):
    name: str
    slug: str

class TopicResponse(BaseModel):
    topic: TopicDetail
    problems: PaginatedProblems
    stats: dict

class StatsOverview(BaseModel):
    totalProblems: int
    totalCompanies: int
    totalTopics: int
    solvedCount: int
    bookmarkedCount: int
    difficultyDistribution: Dict[str, int]
    sourceDistribution: Dict[str, int]
    companyDistribution: List[dict]
    topic_distribution: List[dict]
    recentProblems: List[ProblemListItem]
