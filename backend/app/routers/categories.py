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
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.constants import CATEGORIES
from app.services import activity_service

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
        await db.flush()
        await activity_service.log(db, current_user.id, "category_created", "settings", cat.id, {
            "name": cat.name,
        })
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

    old_name = cat.name
    cat.name = body.name.strip()
    try:
        await db.flush()
        await activity_service.log(db, current_user.id, "category_updated", "settings", cat.id, {
            "name": cat.name,
            "old_name": old_name,
        })
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

    tx_count_result = await db.execute(
        select(func.count()).select_from(Transaction).where(
            Transaction.user_id == current_user.id,
            Transaction.category == cat.name,
        )
    )
    tx_count = tx_count_result.scalar_one()

    budget_count_result = await db.execute(
        select(func.count()).select_from(Budget).where(
            Budget.user_id == current_user.id,
            Budget.category == cat.name,
        )
    )
    budget_count = budget_count_result.scalar_one()

    parts = []
    if tx_count > 0:
        parts.append(f"{tx_count} transaction(s)")
    if budget_count > 0:
        parts.append(f"{budget_count} budget(s)")
    if parts:
        raise HTTPException(status_code=400, detail=f"Cannot delete: used in {', '.join(parts)}")
    count = tx_count

    details = {"name": cat.name, "transaction_count": count}
    await db.delete(cat)
    await db.flush()
    await activity_service.log(db, current_user.id, "category_deleted", "settings", category_id, details)
    await db.commit()
