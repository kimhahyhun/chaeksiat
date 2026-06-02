import httpx
from app.config import settings

BASE_URL = "http://data4library.kr/api"

# 연령 그룹 매핑 (영유아~초등학생만 지원)
def get_age_group(age: int) -> dict:
    if age <= 7:
        return {"label": "영유아", "api_age": 6}
    elif age <= 10:
        return {"label": "초등 저학년", "api_age": 8}
    else:
        return {"label": "초등 고학년", "api_age": 11}

# 성인 전용 KDC 분류명 키워드 (아동/청소년에게 부적합)
ADULT_CLASS_KEYWORDS = [
    "성인", "의학", "법학", "경제학", "경영학", "회계", "행정",
    "군사", "노동", "보험", "세무", "부동산",
]

def is_age_appropriate(class_nm: str | None) -> bool:
    if not class_nm:
        return True
    return not any(kw in class_nm for kw in ADULT_CLASS_KEYWORDS)

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
    """도서관 정보나루 인기 대출 도서 — 연령 그룹 기반"""
    group = get_age_group(age)
    params = {
        "authKey": settings.library_api_key,
        "startDt": "2024-01-01",
        "endDt": "2024-12-31",
        "age": group["api_age"],
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


async def fetch_recommend_list(isbn13: str, max_count: int = 10, age: int = 10) -> list[dict]:
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
                and is_age_appropriate(d["doc"].get("class_nm"))
            ]
        except Exception:
            return []


def get_kdc_major(class_no: str | None) -> str:
    if not class_no:
        return "미분류"
    first = class_no.strip()[0] if class_no.strip() else "?"
    return KDC_CATEGORIES.get(first, "기타")
