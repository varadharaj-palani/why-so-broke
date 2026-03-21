import uuid
from datetime import date, timedelta
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


@router.get("", response_model=list[BudgetOut])
async def list_budgets(
    start_date: date = Query(..., description="Cycle start date"),
    end_date: date = Query(..., description="Cycle end date"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Budget)
        .where(
            Budget.user_id == current_user.id,
            Budget.start_date >= start_date,
            Budget.end_date <= end_date,
        )
        .order_by(Budget.category)
    )
    return result.scalars().all()


@router.post("", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
async def create_budget(
    body: BudgetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = Budget(
        user_id=current_user.id,
        category=body.category,
        start_date=body.start_date,
        end_date=body.end_date,
        month=None,
        amount=body.amount,
    )
    db.add(budget)
    await db.flush()
    await activity_service.log(
        db, current_user.id, "budget_set", "budget", budget.id,
        {
            "category": body.category,
            "start_date": str(body.start_date),
            "end_date": str(body.end_date),
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
    if body.start_date is not None:
        budget.start_date = body.start_date
    if body.end_date is not None:
        budget.end_date = body.end_date
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
    start_date: date = Query(..., description="Cycle start date"),
    end_date: date = Query(..., description="Cycle end date"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budgets_result = await db.execute(
        select(Budget).where(
            Budget.user_id == current_user.id,
            Budget.start_date >= start_date,
            Budget.end_date <= end_date,
        )
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
                    Transaction.date >= start_date,
                    Transaction.date <= end_date,
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
            start_date=budget.start_date,
            end_date=budget.end_date,
        ))

    return sorted(progress, key=lambda x: x.percentage, reverse=True)


@router.post("/copy-previous")
async def copy_previous_cycle(
    start_date: date = Query(..., description="Target cycle start date"),
    end_date: date = Query(..., description="Target cycle end date"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Copy budgets from the most recent past cycle into a new cycle."""
    # Find the most recent past budgets (end_date before target start)
    prev_result = await db.execute(
        select(Budget)
        .where(
            Budget.user_id == current_user.id,
            Budget.end_date < start_date,
        )
        .order_by(Budget.end_date.desc())
    )
    all_prev = prev_result.scalars().all()

    if not all_prev:
        raise HTTPException(status_code=404, detail="No previous budgets found")

    # Find the most recent end_date
    latest_end = max(b.end_date for b in all_prev if b.end_date)
    prev_budgets = [b for b in all_prev if b.end_date == latest_end]
    duration = end_date - start_date

    created = 0
    for b in prev_budgets:
        existing = await db.execute(
            select(Budget).where(
                Budget.user_id == current_user.id,
                Budget.category == b.category,
                Budget.start_date == start_date,
            )
        )
        if not existing.scalar_one_or_none():
            db.add(Budget(
                user_id=current_user.id,
                category=b.category,
                start_date=start_date,
                end_date=end_date,
                month=None,
                amount=b.amount,
            ))
            created += 1

    await db.commit()
    return {"copied": created, "start_date": str(start_date), "end_date": str(end_date)}
