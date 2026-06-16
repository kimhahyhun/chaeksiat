import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Railway PostgreSQL은 postgresql:// 형식 → postgresql+asyncpg://로 변환
def get_database_url() -> str:
    url = settings.database_url
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url

engine = create_async_engine(get_database_url(), echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # cover_url 컬럼 없으면 추가 (기존 DB 호환)
        try:
            await conn.exec_driver_sql(
                "ALTER TABLE librarian_books ADD COLUMN cover_url VARCHAR(500)"
            )
        except Exception:
            pass
        # note 컬럼 없으면 추가 (기존 DB 호환)
        try:
            await conn.exec_driver_sql(
                "ALTER TABLE reading_records ADD COLUMN note VARCHAR(500)"
            )
        except Exception:
            pass
