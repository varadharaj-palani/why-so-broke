import uuid
from datetime import date
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, delete
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.category import Category
from app.models.mode import Mode
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionOut, TransactionListResponse
from app.services import activity_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


def build_filter(current_user: User, **kwargs):
    conditions = [Transaction.user_id == current_user.id]
    if kwargs.get("date_from"):
        conditions.append(Transaction.date >= kwargs["date_from"])
    if kwargs.get("date_to"):
        conditions.append(Transaction.date <= kwargs["date_to"])
    if kwargs.get("amount_min") is not None:
        conditions.append(Transaction.amount >= kwargs["amount_min"])
    if kwargs.get("amount_max") is not None:
        conditions.append(Transaction.amount <= kwargs["amount_max"])
    if kwargs.get("category"):
        conditions.append(Transaction.category == kwargs["category"])
    if kwargs.get("bank_id"):
        conditions.append(Transaction.bank_id == kwargs["bank_id"])
    if kwargs.get("mode"):
        conditions.append(Transaction.mode == kwargs["mode"])
    if kwargs.get("type"):
        conditions.append(Transaction.type == kwargs["type"])
    return conditions


async def _validate_category(db: AsyncSession, user_id: uuid.UUID, category: str) -> None:
    result = await db.execute(
        select(Category).where(Category.user_id == user_id, Category.name == category)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=422, detail=f"Invalid category: {category}")


async def _validate_mode(db: AsyncSession, user_id: uuid.UUID, mode: str) -> None:
    result = await db.execute(
        select(Mode).where(Mode.user_id == user_id, Mode.name == mode)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=422, detail=f"Invalid mode: {mode}")


@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    amount_min: Optional[Decimal] = Query(None),
    amount_max: Optional[Decimal] = Query(None),
    category: Optional[str] = Query(None),
    bank_id: Optional[uuid.UUID] = Query(None),
    mode: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    description: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conditions = build_filter(
        current_user,
        date_from=date_from, date_to=date_to,
        amount_min=amount_min, amount_max=amount_max,
        category=category, bank_id=bank_id, mode=mode, type=type,
    )
    if description:
        conditions.append(Transaction.description.ilike(f"%{description}%"))
    total_result = await db.execute(select(func.count()).select_from(Transaction).where(and_(*conditions)))
    total = total_result.scalar_one()

    offset = (page - 1) * per_page
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.bank), selectinload(Transaction.transfer_to_bank))
        .where(and_(*conditions))
        .order_by(Transaction.date.desc(), Transaction.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    items = result.scalars().all()

    return TransactionListResponse(
        items=items,
        total=total,
        page=page,
        pages=-(-total // per_page),
    )


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    body: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _validate_category(db, current_user.id, body.category)
    await _validate_mode(db, current_user.id, body.mode)

    if body.type == "transfer":
        if not body.transfer_to_bank_id:
            raise HTTPException(status_code=400, detail="transfer_to_bank_id required for transfers")
        group_id = uuid.uuid4()
        tx1 = Transaction(
            user_id=current_user.id, date=body.date, type="transfer",
            description=body.description, category=body.category,
            amount=body.amount, bank_id=body.bank_id,
            transfer_to_bank_id=body.transfer_to_bank_id,
            transfer_group_id=group_id, mode=body.mode, notes=body.notes,
        )
        tx2 = Transaction(
            user_id=current_user.id, date=body.date, type="transfer",
            description=body.description, category=body.category,
            amount=body.amount, bank_id=body.transfer_to_bank_id,
            transfer_to_bank_id=body.bank_id,
            transfer_group_id=group_id, mode=body.mode, notes=body.notes,
        )
        db.add(tx1)
        db.add(tx2)
        await db.flush()
        await activity_service.log(db, current_user.id, "transaction_created", "transaction", tx1.id)
        await db.commit()
        result = await db.execute(
            select(Transaction)
            .options(selectinload(Transaction.bank), selectinload(Transaction.transfer_to_bank))
            .where(Transaction.id == tx1.id)
        )
        return result.scalar_one()
    else:
        tx = Transaction(
            user_id=current_user.id, date=body.date, type=body.type,
            description=body.description, category=body.category,
            amount=body.amount, bank_id=body.bank_id,
            mode=body.mode, notes=body.notes,
        )
        db.add(tx)
        await db.flush()
        await activity_service.log(db, current_user.id, "transaction_created", "transaction", tx.id)
        await db.commit()
        result = await db.execute(
            select(Transaction)
            .options(selectinload(Transaction.bank), selectinload(Transaction.transfer_to_bank))
            .where(Transaction.id == tx.id)
        )
        return result.scalar_one()


@router.put("/{transaction_id}", response_model=TransactionOut)
async def update_transaction(
    transaction_id: uuid.UUID,
    body: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.bank), selectinload(Transaction.transfer_to_bank))
        .where(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
    )
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.type == "transfer":
        raise HTTPException(status_code=400, detail="Cannot edit transfer transactions directly. Delete and recreate.")

    if body.category is not None:
        await _validate_category(db, current_user.id, body.category)
    if body.mode is not None:
        await _validate_mode(db, current_user.id, body.mode)

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(tx, field, value)

    await db.commit()
    await db.refresh(tx)
    return tx


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Transaction).where(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
    )
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if tx.transfer_group_id:
        await db.execute(
            delete(Transaction).where(
                Transaction.transfer_group_id == tx.transfer_group_id,
                Transaction.user_id == current_user.id,
            )
        )
    else:
        await db.delete(tx)

    await db.commit()
