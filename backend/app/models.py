from datetime import datetime, date
from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Child(Base):
    __tablename__ = "children"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50))
    birth_year: Mapped[int] = mapped_column(Integer)
    avatar: Mapped[str] = mapped_column(String(20), default="bear")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    records: Mapped[list["ReadingRecord"]] = relationship(back_populates="child", cascade="all, delete-orphan")


class Book(Base):
    __tablename__ = "books"

    isbn13: Mapped[str] = mapped_column(String(20), primary_key=True)
    title: Mapped[str] = mapped_column(String(300))
    authors: Mapped[str | None] = mapped_column(String(200))
    publisher: Mapped[str | None] = mapped_column(String(100))
    pub_date: Mapped[str | None] = mapped_column(String(20))
    class_no: Mapped[str | None] = mapped_column(String(20))
    class_nm: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(String(2000))
    cover_url: Mapped[str | None] = mapped_column(String(500))

    records: Mapped[list["ReadingRecord"]] = relationship(back_populates="book")


class LibrarianBook(Base):
    __tablename__ = "librarian_books"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    isbn13: Mapped[str | None] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(300))
    authors: Mapped[str | None] = mapped_column(String(300))
    publisher: Mapped[str | None] = mapped_column(String(100))
    pub_year: Mapped[int | None] = mapped_column(Integer)
    subject: Mapped[str | None] = mapped_column(String(50))
    target_age: Mapped[str] = mapped_column(String(20))
    recommend_date: Mapped[str | None] = mapped_column(String(10))
    cover_url: Mapped[str | None] = mapped_column(String(500))


class ReadingRecord(Base):
    __tablename__ = "reading_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_id: Mapped[int] = mapped_column(Integer, ForeignKey("children.id"))
    isbn13: Mapped[str] = mapped_column(String(20), ForeignKey("books.isbn13"))
    read_at: Mapped[date] = mapped_column(Date, default=date.today)
    rating: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    child: Mapped["Child"] = relationship(back_populates="records")
    book: Mapped["Book"] = relationship(back_populates="records")
