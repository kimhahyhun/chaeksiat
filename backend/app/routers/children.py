from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import Child
from app.schemas import ChildCreate, ChildResponse

router = APIRouter(prefix="/children", tags=["children"])


@router.post("", response_model=ChildResponse, status_code=201)
async def create_child(body: ChildCreate, db: AsyncSession = Depends(get_db)):
    child = Child(**body.model_dump())
    db.add(child)
    await db.commit()
    await db.refresh(child)
    return child


@router.get("", response_model=list[ChildResponse])
async def list_children(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Child).order_by(Child.created_at))
    return result.scalars().all()


@router.get("/{child_id}", response_model=ChildResponse)
async def get_child(child_id: int, db: AsyncSession = Depends(get_db)):
    child = await db.get(Child, child_id)
    if not child:
        raise HTTPException(status_code=404, detail="아이 프로필을 찾을 수 없어요")
    return child


@router.delete("/{child_id}", status_code=204)
async def delete_child(child_id: int, db: AsyncSession = Depends(get_db)):
    child = await db.get(Child, child_id)
    if not child:
        raise HTTPException(status_code=404, detail="아이 프로필을 찾을 수 없어요")
    await db.delete(child)
    await db.commit()
