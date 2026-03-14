from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.constants import CATEGORIES, MODES, TYPES
from app.database import get_db
from app.models.bank import Bank
from app.schemas.bank import BankOut
from app.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/meta", tags=["meta"])


@router.get("/constants")
async def get_constants():
    return {"categories": CATEGORIES, "modes": MODES, "types": TYPES}


@router.get("/banks", response_model=list[BankOut])
async def get_banks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Bank)
        .where(Bank.user_id == current_user.id)
        .order_by(Bank.name)
    )
    return result.scalars().all()
