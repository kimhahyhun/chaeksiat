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

BADGES = {
    "문학왕":   lambda dist: dist.get("문학", 0) >= 5,
    "과학탐험가": lambda dist: dist.get("자연과학", 0) >= 3,
    "사회박사": lambda dist: dist.get("사회과학", 0) >= 3,
    "예술가":   lambda dist: dist.get("예술", 0) >= 3,
    "역사학자": lambda dist: dist.get("역사·지리", 0) >= 3,
    "만독왕":   lambda dist: sum(dist.values()) >= 20,
    "균형독서가": lambda dist: len([v for v in dist.values() if v >= 2]) >= 5,
}


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

    earned_badges = [name for name, check in BADGES.items() if check(dict(dist))]

    return {
        "total_books": total,
        "category_distribution": dict(dist),
        "favorite_category": favorite,
        "reading_level": level_name,
        "level_score": level_score,
        "badges": earned_badges,
    }


async def get_recommendations(records: list, birth_year: int) -> list[RecommendedBook]:
    from datetime import date
    age = date.today().year - birth_year

    read_isbns = {r.isbn13 for r in records}

    # 분야별 독서 현황 파악
    dist: Counter = Counter()
    for r in records:
        cat = get_kdc_major(r.book.class_no if r.book else None)
        dist[cat] += 1

    all_categories = set(KDC_CATEGORIES.values())
    read_categories = set(dist.keys()) - {"미분류", "기타"}
    weak_categories = all_categories - read_categories

    recommendations: list[RecommendedBook] = []
    seen_isbns: set[str] = set(read_isbns)

    # 1. 안 읽은 분야 인기 도서 추천
    popular = await fetch_popular_books(age=age, page_size=30)
    for book in popular:
        if book["isbn13"] in seen_isbns:
            continue
        cat = get_kdc_major(book.get("class_no"))
        if cat in weak_categories:
            recommendations.append(RecommendedBook(
                **{k: book.get(k) for k in RecommendedBook.model_fields if k != "reason"},
                reason=f"아직 {cat} 분야 책을 안 읽었어요! 새로운 세계를 탐험해봐요 🌍",
            ))
            seen_isbns.add(book["isbn13"])
        if len(recommendations) >= 5:
            break

    # 2. 가장 좋아하는 분야 연관 추천
    if records:
        recent_isbn = records[-1].isbn13
        related = await fetch_recommend_list(recent_isbn, max_count=10)
        fav_cat = dist.most_common(1)[0][0] if dist else None
        for book in related:
            if book["isbn13"] in seen_isbns:
                continue
            recommendations.append(RecommendedBook(
                **{k: book.get(k) for k in RecommendedBook.model_fields if k != "reason"},
                reason=f"최근에 읽은 책과 비슷한 책이에요 ✨",
            ))
            seen_isbns.add(book["isbn13"])
            if len(recommendations) >= 10:
                break

    # 3. 부족한 경우 인기 도서로 채우기
    if len(recommendations) < 6:
        for book in popular:
            if book["isbn13"] in seen_isbns:
                continue
            recommendations.append(RecommendedBook(
                **{k: book.get(k) for k in RecommendedBook.model_fields if k != "reason"},
                reason="이번 달 인기 도서예요 📚",
            ))
            seen_isbns.add(book["isbn13"])
            if len(recommendations) >= 10:
                break

    return recommendations[:10]
