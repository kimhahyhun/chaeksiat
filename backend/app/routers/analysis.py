import random
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Child, ReadingRecord, LibrarianBook
from app.schemas import ReadingAnalysis, RecommendedBook, LibrarianBookResponse
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
    # 2페이지 병렬 조회로 더 많은 책 확보
    import asyncio
    page1, page2 = await asyncio.gather(
        fetch_popular_books(age=age, page_no=1, page_size=100),
        fetch_popular_books(age=age, page_no=2, page_size=100),
    )
    all_books = page1 + page2

    # 제목 앞 5글자 기준 중복 제거 (흔한남매 1~20권 중복 방지)
    seen_titles: set[str] = set()
    deduped = []
    for b in all_books:
        title = b.get("title", "")
        key = title[:5]
        if key not in seen_titles and b.get("isbn13") and title:
            seen_titles.add(key)
            deduped.append(b)

    # 랜덤 셔플로 매번 다른 책 노출
    random.shuffle(deduped)

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
        for b in deduped[:20]
    ]


@router.get("/librarian-books", response_model=list[LibrarianBookResponse])
async def librarian_books(
    age: int = Query(default=8, ge=1, le=19),
    limit: int = Query(default=10, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
):
    from app.services.library_api import get_age_group
    group = get_age_group(age)
    label = group["label"]

    # 연령 그룹 매핑
    target_map = {
        "영유아": "유아",
        "초등 저학년": "초등저학년",
        "초등 고학년": "초등고학년",
    }
    target = target_map.get(label, "초등저학년")

    result = await db.execute(
        select(LibrarianBook)
        .where(LibrarianBook.target_age == target)
        .order_by(func.random())
        .limit(limit)
    )
    return result.scalars().all()
