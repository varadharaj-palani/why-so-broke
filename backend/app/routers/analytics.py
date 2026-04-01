import uuid
from datetime import date
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case, text
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.analytics import SummaryOut, CategoryBreakdown, MonthlyTrendItem, ModeBreakdown, DailySpendItem

router = APIRouter(prefix="/analytics", tags=["analytics"])


def build_conditions(current_user: User, **kwargs):
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


@router.get("/summary", response_model=SummaryOut)
async def get_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    amount_min: Optional[Decimal] = Query(None),
    amount_max: Optional[Decimal] = Query(None),
    category: Optional[str] = Query(None),
    bank_id: Optional[uuid.UUID] = Query(None),
    mode: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = build_conditions(current_user, date_from=date_from, date_to=date_to,
                            amount_min=amount_min, amount_max=amount_max,
                            category=category, bank_id=bank_id, mode=mode)

    income_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0))
        .where(and_(*base, Transaction.type == "income"))
    )
    expense_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0))
        .where(and_(*base, Transaction.type == "expense"))
    )
    count_result = await db.execute(
        select(func.count()).select_from(Transaction).where(and_(*base))
    )

    income = income_result.scalar_one()
    expense = expense_result.scalar_one()
    return SummaryOut(
        total_income=income,
        total_expense=expense,
        net=income - expense,
        transaction_count=count_result.scalar_one(),
    )


@router.get("/by-category", response_model=list[CategoryBreakdown])
async def by_category(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    amount_min: Optional[Decimal] = Query(None),
    amount_max: Optional[Decimal] = Query(None),
    bank_id: Optional[uuid.UUID] = Query(None),
    mode: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conditions = build_conditions(current_user, date_from=date_from, date_to=date_to,
                                  amount_min=amount_min, amount_max=amount_max,
                                  bank_id=bank_id, mode=mode)
    conditions.append(Transaction.type == "expense")

    result = await db.execute(
        select(Transaction.category, func.sum(Transaction.amount).label("total"))
        .where(and_(*conditions))
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
    )
    return [CategoryBreakdown(category=row.category, total=row.total) for row in result]


@router.get("/monthly-trend", response_model=list[MonthlyTrendItem])
async def monthly_trend(
    months: int = Query(12, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(
            func.to_char(Transaction.date, "YYYY-MM").label("month"),
            func.sum(
                case((Transaction.type == "income", Transaction.amount), else_=0)
            ).label("income"),
            func.sum(
                case((Transaction.type == "expense", Transaction.amount), else_=0)
            ).label("expense"),
        )
        .where(Transaction.user_id == current_user.id)
        .group_by(text("month"))
        .order_by(text("month DESC"))
        .limit(months)
    )
    rows = result.all()
    return [MonthlyTrendItem(month=r.month, income=r.income or 0, expense=r.expense or 0) for r in reversed(rows)]


@router.get("/daily-spend", response_model=list[DailySpendItem])
async def daily_spend(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Transaction.date, func.sum(Transaction.amount).label("total"))
        .where(
            and_(
                Transaction.user_id == current_user.id,
                Transaction.type == "expense",
                Transaction.date >= date_from,
                Transaction.date <= date_to,
            )
        )
        .group_by(Transaction.date)
        .order_by(Transaction.date)
    )
    return [DailySpendItem(date=row.date, total=row.total) for row in result]


@router.get("/by-mode", response_model=list[ModeBreakdown])
async def by_mode(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conditions = build_conditions(current_user, date_from=date_from, date_to=date_to)
    conditions.append(Transaction.type == "expense")

    result = await db.execute(
        select(Transaction.mode, func.sum(Transaction.amount).label("total"))
        .where(and_(*conditions))
        .group_by(Transaction.mode)
        .order_by(func.sum(Transaction.amount).desc())
    )
    return [ModeBreakdown(mode=row.mode, total=row.total) for row in result]
