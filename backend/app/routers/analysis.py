from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Child, ReadingRecord
from app.schemas import ReadingAnalysis, RecommendedBook
from app.services.recommender import compute_analysis, get_recommendations

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
