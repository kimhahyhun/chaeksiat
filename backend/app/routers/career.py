from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Child, ReadingRecord
from app.schemas import CareerAnalysisResponse, CareerRecommendation
from app.services.library_api import get_kdc_major

router = APIRouter(tags=["career"])

CAREERS = [
    {
        "name": "고생물학자",
        "emoji": "🦕",
        "desc": "공룡 같은 고대 생물을 연구하는 과학자",
        "weights": {"자연과학": 10, "역사·지리": 7, "기술·공학": 2},
        "primary": ["자연과학", "역사·지리"],
        "trait": "고대 생물과 지구 역사에 깊은 관심이 있는",
        "default_reason": "과학과 역사에 관심이 많아 고대의 비밀을 탐구하기 좋은 성향이에요!",
        "books": ["공룡 대백과", "선사시대 탐험", "신비한 곤충사전"],
        "activities": ["자연사박물관 관람", "화석 발굴 체험", "고생물 도감 만들기"],
        "color": "amber",
    },
    {
        "name": "과학자",
        "emoji": "🔬",
        "desc": "자연 현상과 원리를 탐구하는 연구자",
        "weights": {"자연과학": 10, "기술·공학": 6, "철학": 2},
        "primary": ["자연과학"],
        "trait": "과학적 탐구심이 매우 강한",
        "default_reason": "세상의 원리를 알고 싶어하는 탐구 의지가 느껴져요!",
        "books": ["이상한 나라의 앨리스", "과학뒤집기", "신비한 원소 사전"],
        "activities": ["과학관 방문하기", "자연 관찰 일지 쓰기", "실험 키트 해보기"],
        "color": "blue",
    },
    {
        "name": "과학 만화가",
        "emoji": "🎨",
        "desc": "과학을 재미있게 표현하는 창작자",
        "weights": {"자연과학": 8, "예술": 8, "문학": 4, "기술·공학": 3},
        "primary": ["자연과학", "예술"],
        "trait": "과학 지식을 재미있게 전달하는 창의적인",
        "default_reason": "과학에 대한 흥미와 이야기를 만드는 능력을 모두 갖추고 있어요!",
        "books": ["놀지마 과학", "만화로 배우는 수학", "헤그맥사와 공룡 헤그"],
        "activities": ["만화 그리기", "과학 실험 기록하기", "스토리텔링 연습"],
        "color": "pink",
    },
    {
        "name": "아동 심리상담사",
        "emoji": "💝",
        "desc": "어린이들의 마음을 돌보는 전문가",
        "weights": {"사회과학": 9, "철학": 8, "문학": 6, "언어": 3},
        "primary": ["사회과학", "철학"],
        "trait": "다른 사람의 감정을 잘 이해하는",
        "default_reason": "감정과 마음에 대한 이해력이 높고 도움을 주고 싶어하는 따뜻한 성격이 보여요!",
        "books": ["감정 사전", "마음이 따뜻한 사람들", "공룡 박사님의 마음 상담소"],
        "activities": ["상담 체험", "감정 표현 활동", "봉사 활동 참여"],
        "color": "rose",
    },
    {
        "name": "작가",
        "emoji": "✍️",
        "desc": "이야기를 만들고 글을 쓰는 창작자",
        "weights": {"문학": 10, "언어": 8, "역사·지리": 3, "철학": 3},
        "primary": ["문학", "언어"],
        "trait": "이야기 흐름을 잘 이해하고 창의적인",
        "default_reason": "문학 작품을 즐겨 읽으며 이야기 감각과 창의적 사고가 돋보여요!",
        "books": ["어린이 글쓰기 교실", "나의 라임오렌지나무", "해리포터"],
        "activities": ["일기 쓰기", "단편 소설 써보기", "독서 클럽 참여"],
        "color": "purple",
    },
    {
        "name": "역사학자",
        "emoji": "🏺",
        "desc": "과거를 탐구하고 역사를 연구하는 학자",
        "weights": {"역사·지리": 10, "사회과학": 5, "철학": 4, "총류": 2},
        "primary": ["역사·지리"],
        "trait": "과거의 사건과 문화에 깊은 관심이 있는",
        "default_reason": "역사와 문화를 즐겨 읽으며 과거를 탐구하려는 호기심이 돋보여요!",
        "books": ["역사 뒤집기", "한국사 탐험", "세계 문명의 비밀"],
        "activities": ["박물관 방문", "역사 유적지 탐방", "역사 일기 쓰기"],
        "color": "orange",
    },
    {
        "name": "엔지니어/발명가",
        "emoji": "⚙️",
        "desc": "새로운 것을 만들고 문제를 해결하는 전문가",
        "weights": {"기술·공학": 10, "자연과학": 7, "총류": 2},
        "primary": ["기술·공학"],
        "trait": "논리적으로 문제를 해결하고 만들기를 좋아하는",
        "default_reason": "어떻게 작동하는지 궁금해하고 새로운 것을 만들고 싶어하는 분석적 사고가 보여요!",
        "books": ["로봇 만들기", "신기한 발명품들", "코딩 탐험"],
        "activities": ["코딩 배우기", "레고로 건물 만들기", "DIY 프로젝트 해보기"],
        "color": "cyan",
    },
    {
        "name": "예술가",
        "emoji": "🎭",
        "desc": "아름다움을 창조하는 예술의 세계",
        "weights": {"예술": 10, "문학": 5, "철학": 4, "언어": 2},
        "primary": ["예술"],
        "trait": "아름다움을 표현하고자 하는 창의적",
        "default_reason": "예술과 감성적인 책을 즐겨 읽으며 창의적 기질이 보여요!",
        "books": ["예술이 뭐야?", "음악의 세계", "그림의 역사"],
        "activities": ["그림 그리기", "악기 배우기", "전시회 관람"],
        "color": "fuchsia",
    },
    {
        "name": "선생님",
        "emoji": "📚",
        "desc": "지식을 나누고 아이들을 가르치는 교육자",
        "weights": {"사회과학": 7, "문학": 6, "역사·지리": 4, "언어": 4, "철학": 3},
        "primary": ["사회과학", "문학"],
        "trait": "다양한 분야에 균형 잡힌 관심이 있는",
        "default_reason": "다양한 분야의 책을 고루 읽으며 지식을 나누고 싶어하는 따뜻한 마음이 느껴져요!",
        "books": ["선생님 학교 가기 싫어요", "가르치는 즐거움", "지식 탐험가"],
        "activities": ["친구에게 공부 가르치기", "독서 모임 만들기", "멘토링 활동"],
        "color": "emerald",
    },
    {
        "name": "환경운동가",
        "emoji": "🌿",
        "desc": "지구 환경을 보호하는 활동가",
        "weights": {"자연과학": 9, "사회과학": 7, "역사·지리": 3},
        "primary": ["자연과학", "사회과학"],
        "trait": "지구와 자연에 대한 깊은 애정이 있는",
        "default_reason": "자연과 환경에 관심이 많고 생태계를 이해하려는 노력이 돋보여요!",
        "books": ["지구를 살리는 아이들", "기후 변화의 비밀", "환경 탐험가"],
        "activities": ["환경 캠페인 참여", "자연 탐방", "재활용 프로젝트"],
        "color": "green",
    },
]


def _compute_scores(category_counts: dict, total: int) -> list[dict]:
    results = []
    for career in CAREERS:
        raw = sum(category_counts.get(cat, 0) * w for cat, w in career["weights"].items())

        primary_match = next(
            (cat for cat in career["primary"] if category_counts.get(cat, 0) > 0), None
        )
        if primary_match:
            cnt = category_counts[primary_match]
            reason = f"{primary_match} 관련 책을 {cnt}권 읽으며 {career['trait']} 성향이 보여요!"
        else:
            reason = career["default_reason"]

        if total == 0:
            match_rate = 75
        else:
            normalized = raw / (total * 10) if total > 0 else 0
            match_rate = min(99, max(75, int(75 + normalized * 24)))

        results.append({
            "name": career["name"],
            "emoji": career["emoji"],
            "desc": career["desc"],
            "reason": reason,
            "match_rate": match_rate,
            "raw_score": raw,
            "books": career["books"],
            "activities": career["activities"],
            "color": career["color"],
        })

    results.sort(key=lambda x: (x["raw_score"], x["match_rate"]), reverse=True)

    # 책 없을 때 기본 순위별 차등
    if total == 0 or all(r["raw_score"] == 0 for r in results):
        for i, r in enumerate(results[:3]):
            r["match_rate"] = 88 - i * 5

    for i, r in enumerate(results[:3]):
        r["rank"] = i + 1

    return results[:3]


@router.get("/children/{child_id}/career", response_model=CareerAnalysisResponse)
async def get_career_recommendations(child_id: int, db: AsyncSession = Depends(get_db)):
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

    from collections import Counter
    dist: Counter = Counter()
    for r in records:
        cat = get_kdc_major(r.book.class_no if r.book else None)
        if cat not in ("미분류", "기타"):
            dist[cat] += 1

    total = len(records)
    top_categories = [cat for cat, _ in dist.most_common(3)]

    if total == 0:
        analysis_pct = 0
    elif total < 3:
        analysis_pct = 30 + total * 10
    elif total < 5:
        analysis_pct = 60 + total * 5
    else:
        analysis_pct = min(85 + total, 99)

    top3 = _compute_scores(dict(dist), total)

    recommendations = [
        CareerRecommendation(
            rank=c["rank"],
            name=c["name"],
            emoji=c["emoji"],
            desc=c["desc"],
            match_rate=c["match_rate"],
            reason=c["reason"],
            recommended_books=c["books"],
            activities=c["activities"],
            color=c["color"],
        )
        for c in top3
    ]

    return CareerAnalysisResponse(
        child_name=child.name,
        total_books=total,
        unique_categories=len(dist),
        analysis_pct=analysis_pct,
        top_categories=top_categories,
        recommendations=recommendations,
    )
