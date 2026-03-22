import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.bank import Bank
from app.schemas.bank import BankCreate, BankUpdate, BankOut
from app.services import activity_service

router = APIRouter(prefix="/banks", tags=["banks"])


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
