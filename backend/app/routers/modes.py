import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.mode import Mode
from app.models.transaction import Transaction
from app.constants import MODES

router = APIRouter(prefix="/modes", tags=["modes"])


class ModeCreate(BaseModel):
    name: str


class ModeUpdate(BaseModel):
    name: str


class ModeOut(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[ModeOut])
async def list_modes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count_result = await db.execute(
        select(func.count()).select_from(Mode).where(Mode.user_id == current_user.id)
    )
    count = count_result.scalar_one()

    if count == 0:
        for name in MODES:
            db.add(Mode(user_id=current_user.id, name=name))
        await db.commit()

    result = await db.execute(
        select(Mode).where(Mode.user_id == current_user.id).order_by(Mode.name)
    )
    return result.scalars().all()


@router.post("", response_model=ModeOut, status_code=status.HTTP_201_CREATED)
async def create_mode(
    body: ModeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mode = Mode(user_id=current_user.id, name=body.name.strip())
    db.add(mode)
    try:
        await db.commit()
        await db.refresh(mode)
        return mode
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Mode already exists")


@router.put("/{mode_id}", response_model=ModeOut)
async def update_mode(
    mode_id: uuid.UUID,
    body: ModeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Mode).where(Mode.id == mode_id, Mode.user_id == current_user.id)
    )
    mode = result.scalar_one_or_none()
    if not mode:
        raise HTTPException(status_code=404, detail="Mode not found")

    mode.name = body.name.strip()
    try:
        await db.commit()
        await db.refresh(mode)
        return mode
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Mode name already in use")


@router.delete("/{mode_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mode(
    mode_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Mode).where(Mode.id == mode_id, Mode.user_id == current_user.id)
    )
    mode = result.scalar_one_or_none()
    if not mode:
        raise HTTPException(status_code=404, detail="Mode not found")

    count_result = await db.execute(
        select(func.count()).select_from(Transaction).where(
            Transaction.user_id == current_user.id,
            Transaction.mode == mode.name,
        )
    )
    count = count_result.scalar_one()
    if count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete: used in {count} transaction(s)")

    await db.delete(mode)
    await db.commit()
