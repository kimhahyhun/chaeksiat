from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import Child, ReadingGoal, ReadingRecord
from app.schemas import GoalCreate, GoalResponse

router = APIRouter(tags=["goals"])


def get_period_range(period: str) -> tuple[date, date]:
    today = date.today()
    if period == "weekly":
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
    else:
        start = today.replace(day=1)
        if today.month == 12:
            end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    return start, end


@router.get("/children/{child_id}/goal", response_model=GoalResponse | None)
async def get_goal(child_id: int, db: AsyncSession = Depends(get_db)):
    child = await db.get(Child, child_id)
    if not child:
        raise HTTPException(status_code=404, detail="아이 프로필을 찾을 수 없어요")

    result = await db.execute(
        select(ReadingGoal)
        .where(ReadingGoal.child_id == child_id)
        .order_by(ReadingGoal.created_at.desc())
    )
    goal = result.scalars().first()
    if not goal:
        return None

    start, end = get_period_range(goal.period)
    count_result = await db.execute(
        select(ReadingRecord).where(
            ReadingRecord.child_id == child_id,
            ReadingRecord.read_at >= start,
            ReadingRecord.read_at <= end,
        )
    )
    current_count = len(count_result.scalars().all())

    return GoalResponse(
        id=goal.id,
        period=goal.period,
        target_count=goal.target_count,
        current_count=current_count,
        period_start=start,
        period_end=end,
    )


@router.post("/children/{child_id}/goal", response_model=GoalResponse, status_code=201)
async def set_goal(child_id: int, body: GoalCreate, db: AsyncSession = Depends(get_db)):
    child = await db.get(Child, child_id)
    if not child:
        raise HTTPException(status_code=404, detail="아이 프로필을 찾을 수 없어요")

    goal = ReadingGoal(child_id=child_id, period=body.period, target_count=body.target_count)
    db.add(goal)
    await db.commit()
    await db.refresh(goal)

    start, end = get_period_range(goal.period)
    count_result = await db.execute(
        select(ReadingRecord).where(
            ReadingRecord.child_id == child_id,
            ReadingRecord.read_at >= start,
            ReadingRecord.read_at <= end,
        )
    )
    current_count = len(count_result.scalars().all())

    return GoalResponse(
        id=goal.id,
        period=goal.period,
        target_count=goal.target_count,
        current_count=current_count,
        period_start=start,
        period_end=end,
    )
