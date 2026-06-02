"""
데모 데이터 시드 스크립트
실행: python seed.py
"""
import asyncio
import os
from datetime import date, timedelta
from dotenv import load_dotenv

load_dotenv()

async def seed():
    from app.database import init_db, AsyncSessionLocal
    from app.models import Child, Book, ReadingRecord
    from app.services.library_api import fetch_popular_books, fetch_book_detail
    from sqlalchemy import select

    await init_db()

    async with AsyncSessionLocal() as db:
        # 기존 데모 데이터 확인
        result = await db.execute(select(Child).where(Child.name == "김하현"))
        if result.scalar_one_or_none():
            print("✅ 데모 데이터가 이미 존재합니다.")
            return

        # 아이 프로필 생성
        child = Child(name="김하현", birth_year=2014, avatar="cat")
        db.add(child)
        await db.flush()
        print(f"✅ 프로필 생성: {child.name} (id={child.id})")

        # 초등 고학년 인기 도서 가져오기
        books_data = await fetch_popular_books(age=12, page_size=30)
        print(f"📚 인기 도서 {len(books_data)}권 조회 완료")

        added = 0
        base_date = date.today() - timedelta(days=60)

        for i, b in enumerate(books_data[:20]):
            isbn = b.get("isbn13")
            if not isbn or not b.get("title"):
                continue

            # 도서 상세 조회 (없으면 인기도서 데이터 사용)
            book = await db.get(Book, isbn)
            if not book:
                detail = await fetch_book_detail(isbn)
                info = detail if detail else b
                book = Book(
                    isbn13=isbn,
                    title=info.get("title") or b.get("title", ""),
                    authors=info.get("authors"),
                    publisher=info.get("publisher"),
                    pub_date=info.get("pub_date"),
                    class_no=info.get("class_no"),
                    class_nm=info.get("class_nm"),
                    description=info.get("description"),
                    cover_url=info.get("cover_url"),
                )
                db.add(book)
                await db.flush()

            # 독서 기록 (3~4일 간격으로 분산)
            read_date = base_date + timedelta(days=i * 3)
            record = ReadingRecord(
                child_id=child.id,
                isbn13=isbn,
                read_at=read_date,
                rating=float((i % 3) + 3),  # 3, 4, 5 반복
            )
            db.add(record)
            added += 1
            print(f"  [{added}] {book.title[:30]}")

        await db.commit()
        print(f"\n🎉 시드 완료! 총 {added}권의 독서 기록 생성")


if __name__ == "__main__":
    asyncio.run(seed())
