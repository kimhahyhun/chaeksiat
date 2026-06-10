"""
사서추천도서 Excel → DB 로드 스크립트
실행: python load_librarian_books.py
"""
import asyncio
import sys
sys.stdout.reconfigure(encoding='utf-8')

import pandas as pd
from dotenv import load_dotenv

load_dotenv()

AGE_MAP = {
    "유아": "유아",
    "초등저학년": "초등저학년",
    "초등고학년": "초등고학년",
}

async def load():
    from app.database import init_db, AsyncSessionLocal
    from app.models import LibrarianBook
    from sqlalchemy import select, func

    await init_db()

    df = pd.read_excel("data/사서추천도서_2007-2025.xlsx")

    # 유아~초등학생만 필터
    df = df[df["대상"].isin(AGE_MAP.keys())].copy()
    df["ISBN"] = df["ISBN"].astype(str).str.strip().str.replace(".0", "", regex=False)

    async with AsyncSessionLocal() as db:
        # 기존 데이터 확인
        count = await db.execute(select(func.count()).select_from(LibrarianBook))
        existing = count.scalar()
        if existing > 0:
            print(f"✅ 이미 {existing}건의 사서 추천 도서가 있습니다.")
            return

        added = 0
        for _, row in df.iterrows():
            isbn = row["ISBN"] if len(str(row["ISBN"])) == 13 else None
            book = LibrarianBook(
                isbn13=isbn,
                title=str(row["책제목"]).strip(),
                authors=str(row["지은이"]).strip() if pd.notna(row["지은이"]) else None,
                publisher=str(row["발행사"]).strip() if pd.notna(row["발행사"]) else None,
                pub_year=int("".join(filter(str.isdigit, str(row["발행년도"])))[:4]) if pd.notna(row["발행년도"]) else None,
                subject=str(row["주제구분"]).strip() if pd.notna(row["주제구분"]) else None,
                target_age=AGE_MAP[row["대상"]],
                recommend_date=str(row["추천연월"]).strip() if pd.notna(row["추천연월"]) else None,
            )
            db.add(book)
            added += 1

        await db.commit()
        print(f"🎉 사서 추천 도서 {added}건 로드 완료!")
        print(f"  - 유아: {len(df[df['대상']=='유아'])}건")
        print(f"  - 초등저학년: {len(df[df['대상']=='초등저학년'])}건")
        print(f"  - 초등고학년: {len(df[df['대상']=='초등고학년'])}건")


if __name__ == "__main__":
    asyncio.run(load())
