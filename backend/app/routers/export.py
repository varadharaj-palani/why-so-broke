import csv
import io
import uuid
from datetime import date
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.transaction import Transaction

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/csv")
async def export_csv(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    amount_min: Optional[Decimal] = Query(None),
    amount_max: Optional[Decimal] = Query(None),
    category: Optional[str] = Query(None),
    bank_id: Optional[uuid.UUID] = Query(None),
    mode: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conditions = [Transaction.user_id == current_user.id]
    if date_from:
        conditions.append(Transaction.date >= date_from)
    if date_to:
        conditions.append(Transaction.date <= date_to)
    if amount_min is not None:
        conditions.append(Transaction.amount >= amount_min)
    if amount_max is not None:
        conditions.append(Transaction.amount <= amount_max)
    if category:
        conditions.append(Transaction.category == category)
    if bank_id:
        conditions.append(Transaction.bank_id == bank_id)
    if mode:
        conditions.append(Transaction.mode == mode)
    if type:
        conditions.append(Transaction.type == type)

    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.bank))
        .where(and_(*conditions))
        .order_by(Transaction.date.desc(), Transaction.created_at.desc())
    )
    transactions = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Type", "Description", "Category", "Amount", "Bank", "Mode", "Notes"])

    for tx in transactions:
        writer.writerow([
            tx.date.isoformat(),
            tx.type,
            tx.description,
            tx.category,
            str(tx.amount),
            tx.bank.name if tx.bank else "",
            tx.mode,
            tx.notes or "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=why-so-broke-export.csv"},
    )
