from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Child, Book, ReadingRecord
from app.schemas import ReadingRecordCreate, ReadingRecordResponse, BookInfo
from app.services.library_api import fetch_book_detail

router = APIRouter(tags=["books"])


@router.get("/books/search", response_model=BookInfo)
async def search_book(isbn13: str, db: AsyncSession = Depends(get_db)):
    """ISBN으로 도서 정보 조회 (DB 우선, 없으면 API 호출)"""
    book = await db.get(Book, isbn13)
    if book:
        return book
    info = await fetch_book_detail(isbn13)
    if not info:
        raise HTTPException(status_code=404, detail="도서 정보를 찾을 수 없어요")
    return info


@router.post("/children/{child_id}/records", response_model=ReadingRecordResponse, status_code=201)
async def add_reading_record(
    child_id: int,
    body: ReadingRecordCreate,
    db: AsyncSession = Depends(get_db),
):
    child = await db.get(Child, child_id)
    if not child:
        raise HTTPException(status_code=404, detail="아이 프로필을 찾을 수 없어요")

    # 도서 정보 확인 / 자동 저장
    book = await db.get(Book, body.isbn13)
    if not book:
        info = await fetch_book_detail(body.isbn13)
        if not info:
            raise HTTPException(status_code=404, detail="ISBN에 해당하는 도서를 찾을 수 없어요")
        book = Book(**info)
        db.add(book)
        await db.flush()

    # 중복 확인
    dup = await db.execute(
        select(ReadingRecord).where(
            ReadingRecord.child_id == child_id,
            ReadingRecord.isbn13 == body.isbn13,
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="이미 읽은 책으로 등록되어 있어요")

    record = ReadingRecord(child_id=child_id, **body.model_dump())
    db.add(record)
    await db.commit()
    await db.refresh(record)

    result = await db.execute(
        select(ReadingRecord)
        .options(selectinload(ReadingRecord.book))
        .where(ReadingRecord.id == record.id)
    )
    return result.scalar_one()


@router.get("/children/{child_id}/records", response_model=list[ReadingRecordResponse])
async def get_reading_records(child_id: int, db: AsyncSession = Depends(get_db)):
    child = await db.get(Child, child_id)
    if not child:
        raise HTTPException(status_code=404, detail="아이 프로필을 찾을 수 없어요")

    result = await db.execute(
        select(ReadingRecord)
        .options(selectinload(ReadingRecord.book))
        .where(ReadingRecord.child_id == child_id)
        .order_by(ReadingRecord.read_at.desc())
    )
    return result.scalars().all()


@router.delete("/children/{child_id}/records/{record_id}", status_code=204)
async def delete_record(child_id: int, record_id: int, db: AsyncSession = Depends(get_db)):
    record = await db.get(ReadingRecord, record_id)
    if not record or record.child_id != child_id:
        raise HTTPException(status_code=404, detail="기록을 찾을 수 없어요")
    await db.delete(record)
    await db.commit()
