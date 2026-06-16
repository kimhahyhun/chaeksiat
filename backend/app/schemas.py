from datetime import datetime, date
from typing import Literal
from pydantic import BaseModel, Field


class ChildCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    birth_year: int = Field(..., ge=2000, le=2025)
    avatar: str = "bear"


class ChildUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=50)
    birth_year: int | None = Field(None, ge=2000, le=2025)
    avatar: str | None = None


class ChildResponse(BaseModel):
    id: int
    name: str
    birth_year: int
    avatar: str
    created_at: datetime

    model_config = {"from_attributes": True}


class BookInfo(BaseModel):
    isbn13: str
    title: str
    authors: str | None = None
    publisher: str | None = None
    pub_date: str | None = None
    class_no: str | None = None
    class_nm: str | None = None
    description: str | None = None
    cover_url: str | None = None

    model_config = {"from_attributes": True}


class ReadingRecordCreate(BaseModel):
    isbn13: str
    read_at: date = Field(default_factory=date.today)
    rating: float | None = Field(None, ge=1, le=5)


class ReadingRecordResponse(BaseModel):
    id: int
    isbn13: str
    read_at: date
    rating: float | None
    book: BookInfo

    model_config = {"from_attributes": True}


class BadgeInfo(BaseModel):
    name: str
    level: int


class ReadingAnalysis(BaseModel):
    total_books: int
    category_distribution: dict[str, int]
    favorite_category: str | None
    reading_level: str
    level_score: int
    badges: list[BadgeInfo]


class LibrarianBookResponse(BaseModel):
    id: int
    isbn13: str | None
    title: str
    authors: str | None = None
    publisher: str | None = None
    pub_year: int | None = None
    subject: str | None = None
    target_age: str
    cover_url: str | None = None

    model_config = {"from_attributes": True}


class GoalCreate(BaseModel):
    period: Literal["weekly", "monthly"]
    target_count: int = Field(..., ge=1, le=100)


class GoalResponse(BaseModel):
    id: int
    period: str
    target_count: int
    current_count: int
    period_start: date
    period_end: date

    model_config = {"from_attributes": True}


class RecommendedBook(BaseModel):
    isbn13: str
    title: str
    authors: str | None = None
    publisher: str | None = None
    class_no: str | None = None
    class_nm: str | None = None
    cover_url: str | None = None
    reason: str
