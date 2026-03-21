import uuid
from datetime import date, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetOut, BudgetProgress
from app.services import activity_service

router = APIRouter(prefix="/budgets", tags=["budgets"])


def get_current_cycle(start: date, end: date, today: date) -> tuple[date, date]:
    """Compute the current recurring cycle that contains `today`."""
    if today < start:
        return start, end
    duration = (end - start).days + 1
    n = (today - start).days // duration
    cs = start + timedelta(days=n * duration)
    ce = cs + timedelta(days=duration - 1)
    return cs, ce


@router.get("", response_model=list[BudgetOut])
async def list_budgets(
    active_on: date | None = Query(None, description="Return budgets whose first cycle has started on or before this date"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conditions = [Budget.user_id == current_user.id]
    if active_on is not None:
        conditions.append(Budget.start_date <= active_on)
    result = await db.execute(
        select(Budget).where(*conditions).order_by(Budget.category)
    )
    return result.scalars().all()


@router.post("", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
async def create_budget(
    body: BudgetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    end_date = body.start_date + timedelta(days=body.cycle_days - 1)
    budget = Budget(
        user_id=current_user.id,
        category=body.category,
        start_date=body.start_date,
        end_date=end_date,
        month=None,
        amount=body.amount,
    )
    db.add(budget)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="A budget for this category and start date already exists.")
    await activity_service.log(
        db, current_user.id, "budget_set", "budget", budget.id,
        {
            "category": body.category,
            "start_date": str(body.start_date),
            "cycle_days": body.cycle_days,
            "amount": float(body.amount),
        },
    )
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

    if body.amount is not None:
        budget.amount = body.amount

    if body.cycle_days is not None:
        base = body.start_date if body.start_date is not None else budget.start_date
        if body.start_date is not None:
            budget.start_date = body.start_date
        budget.end_date = base + timedelta(days=body.cycle_days - 1)
    elif body.start_date is not None:
        # Only start_date changed — preserve cycle duration
        if budget.start_date and budget.end_date:
            duration_days = (budget.end_date - budget.start_date).days
            budget.end_date = body.start_date + timedelta(days=duration_days)
        budget.start_date = body.start_date

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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    budgets_result = await db.execute(
        select(Budget).where(
            Budget.user_id == current_user.id,
            Budget.start_date <= today,
        )
    )
    budgets = budgets_result.scalars().all()

    progress = []
    for budget in budgets:
        cs, ce = get_current_cycle(budget.start_date, budget.end_date, today)
        spent_result = await db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0))
            .where(
                and_(
                    Transaction.user_id == current_user.id,
                    Transaction.category == budget.category,
                    Transaction.type == "expense",
                    Transaction.date >= cs,
                    Transaction.date <= ce,
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
            current_cycle_start=cs,
            current_cycle_end=ce,
        ))

    return sorted(progress, key=lambda x: x.percentage, reverse=True)
