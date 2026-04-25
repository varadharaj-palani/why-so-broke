import uuid
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.bank import Bank
from app.models.transaction import Transaction
from app.models.jar import JarContribution
from app.schemas.bank import BankCreate, BankUpdate, BankOut
from app.services import activity_service


class BankBalance(BaseModel):
    bank_id: uuid.UUID
    bank_name: str
    short_code: Optional[str]
    total_balance: Decimal
    jar_locked: Decimal
    available: Decimal

router = APIRouter(prefix="/banks", tags=["banks"])


@router.get("/balances", response_model=list[BankBalance])
async def get_bank_balances(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    banks_result = await db.execute(
        select(Bank).where(Bank.user_id == current_user.id, Bank.is_archived == False).order_by(Bank.name)
    )
    banks = banks_result.scalars().all()

    # Transaction balance per bank: income and inbound transfers add, expenses and outbound transfers subtract
    tx_result = await db.execute(
        select(
            Transaction.bank_id,
            func.sum(
                case(
                    (Transaction.type == "income", Transaction.amount),
                    else_=-Transaction.amount,
                )
            ).label("balance"),
        )
        .where(Transaction.user_id == current_user.id, Transaction.bank_id != None)
        .group_by(Transaction.bank_id)
    )
    tx_map: dict[uuid.UUID, Decimal] = {r.bank_id: r.balance or Decimal("0") for r in tx_result.all()}

    # Inbound transfers (transfer_to_bank_id) add to balance
    transfer_in_result = await db.execute(
        select(
            Transaction.transfer_to_bank_id,
            func.sum(Transaction.amount).label("total"),
        )
        .where(
            Transaction.user_id == current_user.id,
            Transaction.type == "transfer",
            Transaction.transfer_to_bank_id != None,
        )
        .group_by(Transaction.transfer_to_bank_id)
    )
    for r in transfer_in_result.all():
        bid = r.transfer_to_bank_id
        tx_map[bid] = tx_map.get(bid, Decimal("0")) + (r.total or Decimal("0"))

    # Jar locked amounts per bank (sum of positive contributions)
    jar_result = await db.execute(
        select(
            JarContribution.bank_id,
            func.sum(JarContribution.amount).label("locked"),
        )
        .where(JarContribution.user_id == current_user.id)
        .group_by(JarContribution.bank_id)
    )
    jar_map: dict[uuid.UUID | None, Decimal] = {r.bank_id: r.locked or Decimal("0") for r in jar_result.all()}

    result = []
    for bank in banks:
        total = tx_map.get(bank.id, Decimal("0"))
        locked = jar_map.get(bank.id, Decimal("0"))
        result.append(BankBalance(
            bank_id=bank.id,
            bank_name=bank.name,
            short_code=bank.short_code,
            total_balance=total,
            jar_locked=locked,
            available=total - locked,
        ))
    return result


@router.get("", response_model=list[BankOut])
async def list_banks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Bank).where(Bank.user_id == current_user.id, Bank.is_archived == False).order_by(Bank.name)
    )
    return result.scalars().all()


@router.post("", response_model=BankOut, status_code=status.HTTP_201_CREATED)
async def create_bank(
    body: BankCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bank = Bank(user_id=current_user.id, name=body.name, short_code=body.short_code)
    db.add(bank)
    await db.flush()
    await activity_service.log(db, current_user.id, "bank_created", "settings", bank.id, {
        "name": body.name,
        "short_code": body.short_code,
    })
    await db.commit()
    await db.refresh(bank)
    return bank


@router.put("/{bank_id}", response_model=BankOut)
async def update_bank(
    bank_id: uuid.UUID,
    body: BankUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Bank).where(Bank.id == bank_id, Bank.user_id == current_user.id)
    )
    bank = result.scalar_one_or_none()
    if not bank:
        raise HTTPException(status_code=404, detail="Bank not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(bank, field, value)

    await db.flush()
    await activity_service.log(db, current_user.id, "bank_updated", "settings", bank.id, {
        "name": bank.name,
        "short_code": bank.short_code,
    })
    await db.commit()
    await db.refresh(bank)
    return bank


@router.delete("/{bank_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bank(
    bank_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Bank).where(Bank.id == bank_id, Bank.user_id == current_user.id)
    )
    bank = result.scalar_one_or_none()
    if not bank:
        raise HTTPException(status_code=404, detail="Bank not found")

    bank.is_archived = True
    await db.flush()
    await activity_service.log(db, current_user.id, "bank_archived", "settings", bank_id, {
        "name": bank.name,
        "short_code": bank.short_code,
    })
    await db.commit()
