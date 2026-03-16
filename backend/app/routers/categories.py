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
from app.models.category import Category
from app.models.transaction import Transaction
from app.constants import CATEGORIES

router = APIRouter(prefix="/categories", tags=["categories"])


class CategoryCreate(BaseModel):
    name: str


class CategoryUpdate(BaseModel):
    name: str


class CategoryOut(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[CategoryOut])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count_result = await db.execute(
        select(func.count()).select_from(Category).where(Category.user_id == current_user.id)
    )
    count = count_result.scalar_one()

    if count == 0:
        for name in CATEGORIES:
            db.add(Category(user_id=current_user.id, name=name))
        await db.commit()

    result = await db.execute(
        select(Category).where(Category.user_id == current_user.id).order_by(Category.name)
    )
    return result.scalars().all()


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    body: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cat = Category(user_id=current_user.id, name=body.name.strip())
    db.add(cat)
    try:
        await db.commit()
        await db.refresh(cat)
        return cat
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Category already exists")


@router.put("/{category_id}", response_model=CategoryOut)
async def update_category(
    category_id: uuid.UUID,
    body: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Category).where(Category.id == category_id, Category.user_id == current_user.id)
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    cat.name = body.name.strip()
    try:
        await db.commit()
        await db.refresh(cat)
        return cat
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Category name already in use")


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Category).where(Category.id == category_id, Category.user_id == current_user.id)
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    count_result = await db.execute(
        select(func.count()).select_from(Transaction).where(
            Transaction.user_id == current_user.id,
            Transaction.category == cat.name,
        )
    )
    count = count_result.scalar_one()
    if count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete: used in {count} transaction(s)")

    await db.delete(cat)
    await db.commit()
