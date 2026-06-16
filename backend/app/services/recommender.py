import random
from collections import Counter
from app.services.library_api import fetch_popular_books, fetch_recommend_list, get_kdc_major, KDC_CATEGORIES
from app.schemas import RecommendedBook


# 독서 레벨 기준 (읽은 책 수)
READING_LEVELS = [
    (0,   "씨앗",   0),
    (3,   "새싹",   1),
    (10,  "줄기",   2),
    (20,  "가지",   3),
    (35,  "잎사귀", 4),
    (50,  "꽃",     5),
    (75,  "열매",   6),
    (100, "나무",   7),
]

# 분야별 배지: 3권마다 1단계씩 누적
SUBJECT_BADGES = {
    "문학왕": "문학",
    "과학탐험가": "자연과학",
    "사회박사": "사회과학",
    "예술가": "예술",
    "역사학자": "역사·지리",
}
BADGE_BOOKS_PER_LEVEL = 3


def compute_analysis(records: list) -> dict:
    dist: Counter = Counter()
    for r in records:
        cat = get_kdc_major(r.book.class_no if r.book else None)
        dist[cat] += 1

    total = sum(dist.values())
    favorite = dist.most_common(1)[0][0] if dist else None

    level_name, level_score = "씨앗", 0
    for threshold, name, score in READING_LEVELS:
        if total >= threshold:
            level_name, level_score = name, score

    earned_badges = []
    for name, cat in SUBJECT_BADGES.items():
        level = dist.get(cat, 0) // BADGE_BOOKS_PER_LEVEL
        if level > 0:
            earned_badges.append({"name": name, "level": level})

    if total >= 20:
        earned_badges.append({"name": "다독왕", "level": total // 20})
    if len([v for v in dist.values() if v >= 2]) >= 5:
        earned_badges.append({"name": "균형독서가", "level": 1})

    return {
        "total_books": total,
        "category_distribution": dict(dist),
        "favorite_category": favorite,
        "reading_level": level_name,
        "level_score": level_score,
        "badges": earned_badges,
    }


def _dedupe(books: list[dict], seen: set[str]) -> list[dict]:
    """ISBN + 제목 앞 5글자 기준 중복 제거"""
    seen_titles: set[str] = set()
    result = []
    for b in books:
        isbn = b.get("isbn13", "")
        title_key = (b.get("title", "") or "")[:5]
        if isbn in seen or title_key in seen_titles:
            continue
        seen.add(isbn)
        seen_titles.add(title_key)
        result.append(b)
    return result


async def get_recommendations(records: list, birth_year: int) -> list[RecommendedBook]:
    from datetime import date
    import asyncio
    age = min(date.today().year - birth_year, 13)  # 최대 초등고학년 기준

    read_isbns = {r.isbn13 for r in records}
    seen_isbns: set[str] = set(read_isbns)

    # 분야별 독서 현황 파악
    dist: Counter = Counter()
    for r in records:
        cat = get_kdc_major(r.book.class_no if r.book else None)
        dist[cat] += 1

    all_categories = set(KDC_CATEGORIES.values())
    read_categories = set(dist.keys()) - {"미분류", "기타"}

    # 부족한 분야: 전혀 안 읽은 분야 > 적게 읽은 분야 순으로 우선순위
    unread = all_categories - read_categories
    low_read = sorted(
        [(cat, cnt) for cat, cnt in dist.items() if cat not in {"미분류", "기타"}],
        key=lambda x: x[1]
    )
    priority_categories = list(unread) + [cat for cat, _ in low_read]

    # 인기 도서 2페이지 병렬 조회
    page1, page2 = await asyncio.gather(
        fetch_popular_books(age=age, page_no=1, page_size=100),
        fetch_popular_books(age=age, page_no=2, page_size=100),
    )
    all_popular = _dedupe(page1 + page2, set())
    random.shuffle(all_popular)

    recommendations: list[RecommendedBook] = []

    # 1. 부족한 분야 우선 추천 (최대 6권)
    for cat in priority_categories:
        if len(recommendations) >= 6:
            break
        for book in all_popular:
            if book["isbn13"] in seen_isbns:
                continue
            if get_kdc_major(book.get("class_no")) != cat:
                continue
            reason = (
                f"아직 {cat} 분야 책을 안 읽었어요! 탐험해봐요 🌍"
                if cat in unread
                else f"{cat} 분야를 더 읽어봐요! 균형잡힌 독서가 될 거예요 📖"
            )
            recommendations.append(RecommendedBook(
                **{k: book.get(k) for k in RecommendedBook.model_fields if k != "reason"},
                reason=reason,
            ))
            seen_isbns.add(book["isbn13"])
            break

    # 2. 최근 읽은 책 기반 연관 추천 (최대 4권)
    if records:
        recent_isbn = records[0].isbn13
        related = await fetch_recommend_list(recent_isbn, max_count=15, age=age)
        related = _dedupe(related, seen_isbns)
        for book in related[:4]:
            recommendations.append(RecommendedBook(
                **{k: book.get(k) for k in RecommendedBook.model_fields if k != "reason"},
                reason="최근에 읽은 책과 비슷한 책이에요 ✨",
            ))
            seen_isbns.add(book["isbn13"])

    # 3. 부족하면 인기 도서로 채우기
    for book in all_popular:
        if len(recommendations) >= 10:
            break
        if book["isbn13"] in seen_isbns:
            continue
        recommendations.append(RecommendedBook(
            **{k: book.get(k) for k in RecommendedBook.model_fields if k != "reason"},
            reason="이번 달 인기 도서예요 📚",
        ))
        seen_isbns.add(book["isbn13"])

    return recommendations[:10]
