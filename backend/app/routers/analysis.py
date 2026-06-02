from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Child, ReadingRecord
from app.schemas import ReadingAnalysis, RecommendedBook
from app.services.recommender import compute_analysis, get_recommendations
from app.services.library_api import fetch_popular_books

router = APIRouter(tags=["analysis"])


@router.get("/children/{child_id}/analysis", response_model=ReadingAnalysis)
async def analyze(child_id: int, db: AsyncSession = Depends(get_db)):
    child = await db.get(Child, child_id)
    if not child:
        raise HTTPException(status_code=404, detail="아이 프로필을 찾을 수 없어요")

    result = await db.execute(
        select(ReadingRecord)
        .options(selectinload(ReadingRecord.book))
        .where(ReadingRecord.child_id == child_id)
    )
    records = result.scalars().all()
    return compute_analysis(records)


@router.get("/children/{child_id}/recommendations", response_model=list[RecommendedBook])
async def recommend(child_id: int, db: AsyncSession = Depends(get_db)):
    child = await db.get(Child, child_id)
    if not child:
        raise HTTPException(status_code=404, detail="아이 프로필을 찾을 수 없어요")

    result = await db.execute(
        select(ReadingRecord)
        .options(selectinload(ReadingRecord.book))
        .where(ReadingRecord.child_id == child_id)
        .order_by(ReadingRecord.read_at.desc())
    )
    records = result.scalars().all()
    return await get_recommendations(records, child.birth_year)


@router.get("/popular-books", response_model=list[RecommendedBook])
async def popular_books(age: int = Query(default=8, ge=1, le=19)):
    books = await fetch_popular_books(age=age, page_size=20)
    return [
        RecommendedBook(
            isbn13=b.get("isbn13", ""),
            title=b.get("title", ""),
            authors=b.get("authors"),
            publisher=b.get("publisher"),
            class_no=b.get("class_no"),
            class_nm=b.get("class_nm"),
            cover_url=b.get("cover_url"),
            reason="이번 달 인기 도서",
        )
        for b in books
        if b.get("isbn13") and b.get("title")
    ]
