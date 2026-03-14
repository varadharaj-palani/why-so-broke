import uuid
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetOut, BudgetProgress
from app.services import activity_service

router = APIRouter(prefix="/budgets", tags=["budgets"])


def parse_month(month_str: str) -> date:
    try:
        year, month = month_str.split("-")
        return date(int(year), int(month), 1)
    except Exception:
        raise HTTPException(status_code=400, detail="month must be in YYYY-MM format")


@router.get("", response_model=list[BudgetOut])
async def list_budgets(
    month: str = Query(..., description="YYYY-MM format"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    month_date = parse_month(month)
    result = await db.execute(
        select(Budget)
        .where(Budget.user_id == current_user.id, Budget.month == month_date)
        .order_by(Budget.category)
    )
    return result.scalars().all()


@router.post("", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
async def create_budget(
    body: BudgetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    month_date = date(body.month.year, body.month.month, 1)
    budget = Budget(user_id=current_user.id, category=body.category, month=month_date, amount=body.amount)
    db.add(budget)
    await db.flush()
    await activity_service.log(db, current_user.id, "budget_set", "budget", budget.id,
                                {"category": body.category, "month": str(month_date), "amount": float(body.amount)})
    await db.commit()
    await db.refresh(budget)
    return budget


@router.put("/{budget_id}", response_model=BudgetOut)
async def update_budget(
    budget_id: uuid.UUID,
    body: BudgetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Budget).where(Budget.id == budget_id, Budget.user_id == current_user.id)
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    budget.amount = body.amount
    await db.commit()
    await db.refresh(budget)
    return budget


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Budget).where(Budget.id == budget_id, Budget.user_id == current_user.id)
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    await db.delete(budget)
    await db.commit()


@router.get("/progress", response_model=list[BudgetProgress])
async def budget_progress(
    month: str = Query(..., description="YYYY-MM format"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    month_date = parse_month(month)
    next_month_date = date(month_date.year + (month_date.month // 12), ((month_date.month % 12) + 1), 1)

    budgets_result = await db.execute(
        select(Budget).where(Budget.user_id == current_user.id, Budget.month == month_date)
    )
    budgets = budgets_result.scalars().all()

    progress = []
    for budget in budgets:
        spent_result = await db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0))
            .where(
                and_(
                    Transaction.user_id == current_user.id,
                    Transaction.category == budget.category,
                    Transaction.type == "expense",
                    Transaction.date >= month_date,
                    Transaction.date < next_month_date,
                )
            )
        )
        spent = spent_result.scalar_one()
        pct = float(spent / budget.amount * 100) if budget.amount > 0 else 0.0
        progress.append(BudgetProgress(
            category=budget.category,
            budget_amount=budget.amount,
            spent_amount=spent,
            percentage=round(pct, 1),
        ))

    return sorted(progress, key=lambda x: x.percentage, reverse=True)


@router.post("/copy-previous")
async def copy_previous_month(
    month: str = Query(..., description="YYYY-MM format — target month to copy budgets INTO"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target = parse_month(month)
    prev_month = target.month - 1
    prev_year = target.year
    if prev_month == 0:
        prev_month = 12
        prev_year -= 1
    prev_date = date(prev_year, prev_month, 1)

    prev_result = await db.execute(
        select(Budget).where(Budget.user_id == current_user.id, Budget.month == prev_date)
    )
    prev_budgets = prev_result.scalars().all()

    if not prev_budgets:
        raise HTTPException(status_code=404, detail="No budgets found for previous month")

    created = 0
    for b in prev_budgets:
        existing = await db.execute(
            select(Budget).where(Budget.user_id == current_user.id, Budget.category == b.category, Budget.month == target)
        )
        if not existing.scalar_one_or_none():
            db.add(Budget(user_id=current_user.id, category=b.category, month=target, amount=b.amount))
            created += 1

    await db.commit()
    return {"copied": created, "month": str(target)}
