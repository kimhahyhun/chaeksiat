import httpx
from app.config import settings

BASE_URL = "http://data4library.kr/api"

# KDC 주요 분류 (첫 자리 기준)
KDC_CATEGORIES = {
    "0": "총류",
    "1": "철학",
    "2": "종교",
    "3": "사회과학",
    "4": "자연과학",
    "5": "기술·공학",
    "6": "예술",
    "7": "언어",
    "8": "문학",
    "9": "역사·지리",
}


async def fetch_book_detail(isbn13: str) -> dict | None:
    params = {
        "authKey": settings.library_api_key,
        "isbn13": isbn13,
        "format": "json",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            res = await client.get(f"{BASE_URL}/srchDtlList", params=params)
            data = res.json()
            book = data["response"]["detail"][0]["book"]
            return {
                "isbn13": book.get("isbn13"),
                "title": book.get("bookname"),
                "authors": book.get("authors"),
                "publisher": book.get("publisher"),
                "pub_date": book.get("publication_date"),
                "class_no": book.get("class_no"),
                "class_nm": book.get("class_nm"),
                "description": book.get("description"),
                "cover_url": book.get("bookImageURL"),
            }
        except Exception:
            return None


async def fetch_popular_books(age: int, page_no: int = 1, page_size: int = 20) -> list[dict]:
    """도서관 정보나루 인기 대출 도서 (아동 분야)"""
    params = {
        "authKey": settings.library_api_key,
        "startDt": "2024-01-01",
        "endDt": "2024-12-31",
        "age": age,
        "pageNo": page_no,
        "pageSize": page_size,
        "format": "json",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            res = await client.get(f"{BASE_URL}/loanItemSrch", params=params)
            data = res.json()
            docs = data.get("response", {}).get("docs", [])
            return [
                {
                    "isbn13": d["doc"].get("isbn13"),
                    "title": d["doc"].get("bookname"),
                    "authors": d["doc"].get("authors"),
                    "publisher": d["doc"].get("publisher"),
                    "class_no": d["doc"].get("class_no"),
                    "class_nm": d["doc"].get("class_nm"),
                    "cover_url": d["doc"].get("bookImageURL"),
                }
                for d in docs
                if d["doc"].get("isbn13")
            ]
        except Exception:
            return []


async def fetch_recommend_list(isbn13: str, max_count: int = 5) -> list[dict]:
    """연관 도서 추천 (다독자를 위한 추천도서 API)"""
    params = {
        "authKey": settings.library_api_key,
        "isbn13": isbn13,
        "maxSize": max_count,
        "format": "json",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            res = await client.get(f"{BASE_URL}/recommandList", params=params)
            data = res.json()
            docs = data.get("response", {}).get("docs", [])
            return [
                {
                    "isbn13": d["doc"].get("isbn13"),
                    "title": d["doc"].get("bookname"),
                    "authors": d["doc"].get("authors"),
                    "publisher": d["doc"].get("publisher"),
                    "class_no": d["doc"].get("class_no"),
                    "class_nm": d["doc"].get("class_nm"),
                    "cover_url": d["doc"].get("bookImageURL"),
                }
                for d in docs
                if d["doc"].get("isbn13")
            ]
        except Exception:
            return []


def get_kdc_major(class_no: str | None) -> str:
    if not class_no:
        return "미분류"
    first = class_no.strip()[0] if class_no.strip() else "?"
    return KDC_CATEGORIES.get(first, "기타")
