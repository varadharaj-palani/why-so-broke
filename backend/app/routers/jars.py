import uuid
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.bank import Bank
from app.models.jar import Jar, JarContribution
from app.schemas.jar import JarCreate, JarUpdate, JarOut, JarContributionCreate, JarContributionOut, BankBreakdown

router = APIRouter(prefix="/jars", tags=["jars"])


async def _build_jar_out(jar: Jar, db: AsyncSession) -> JarOut:
    result = await db.execute(
        select(
            JarContribution.bank_id,
            Bank.name.label("bank_name"),
            func.sum(JarContribution.amount).label("total"),
        )
        .outerjoin(Bank, JarContribution.bank_id == Bank.id)
        .where(JarContribution.jar_id == jar.id)
        .group_by(JarContribution.bank_id, Bank.name)
    )
    rows = result.all()

    breakdown = [
        BankBreakdown(bank_id=r.bank_id, bank_name=r.bank_name, total=r.total)
        for r in rows
    ]
    balance = sum((b.total for b in breakdown), Decimal("0"))

    return JarOut(
        id=jar.id,
        name=jar.name,
        description=jar.description,
        target_amount=jar.target_amount,
        color=jar.color,
        emoji=jar.emoji,
        is_archived=jar.is_archived,
        balance=balance,
        bank_breakdown=breakdown,
        created_at=jar.created_at,
        updated_at=jar.updated_at,
    )


@router.get("", response_model=list[JarOut])
async def list_jars(
    include_archived: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Jar).where(Jar.user_id == current_user.id)
    if not include_archived:
        q = q.where(Jar.is_archived == False)
    q = q.order_by(Jar.created_at)
    result = await db.execute(q)
    jars = result.scalars().all()
    return [await _build_jar_out(jar, db) for jar in jars]


@router.post("", response_model=JarOut, status_code=status.HTTP_201_CREATED)
async def create_jar(
    body: JarCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jar = Jar(
        user_id=current_user.id,
        name=body.name,
        description=body.description,
        target_amount=body.target_amount,
        color=body.color,
        emoji=body.emoji,
    )
    db.add(jar)
    await db.commit()
    await db.refresh(jar)
    return await _build_jar_out(jar, db)


@router.put("/{jar_id}", response_model=JarOut)
async def update_jar(
    jar_id: uuid.UUID,
    body: JarUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Jar).where(Jar.id == jar_id, Jar.user_id == current_user.id)
    )
    jar = result.scalar_one_or_none()
    if not jar:
        raise HTTPException(status_code=404, detail="Jar not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(jar, field, value)

    await db.commit()
    await db.refresh(jar)
    return await _build_jar_out(jar, db)


@router.delete("/{jar_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_jar(
    jar_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Jar).where(Jar.id == jar_id, Jar.user_id == current_user.id)
    )
    jar = result.scalar_one_or_none()
    if not jar:
        raise HTTPException(status_code=404, detail="Jar not found")

    jar.is_archived = True
    await db.commit()


@router.get("/{jar_id}/contributions", response_model=list[JarContributionOut])
async def list_contributions(
    jar_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jar_result = await db.execute(
        select(Jar).where(Jar.id == jar_id, Jar.user_id == current_user.id)
    )
    if not jar_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Jar not found")

    result = await db.execute(
        select(JarContribution, Bank.name.label("bank_name"))
        .outerjoin(Bank, JarContribution.bank_id == Bank.id)
        .where(JarContribution.jar_id == jar_id)
        .order_by(JarContribution.date.desc(), JarContribution.created_at.desc())
    )
    rows = result.all()

    return [
        JarContributionOut(
            id=c.JarContribution.id,
            jar_id=c.JarContribution.jar_id,
            bank_id=c.JarContribution.bank_id,
            bank_name=c.bank_name,
            amount=c.JarContribution.amount,
            date=c.JarContribution.date,
            notes=c.JarContribution.notes,
            created_at=c.JarContribution.created_at,
        )
        for c in rows
    ]


@router.post("/{jar_id}/contributions", response_model=JarContributionOut, status_code=status.HTTP_201_CREATED)
async def add_contribution(
    jar_id: uuid.UUID,
    body: JarContributionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jar_result = await db.execute(
        select(Jar).where(Jar.id == jar_id, Jar.user_id == current_user.id)
    )
    if not jar_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Jar not found")

    if body.bank_id:
        bank_result = await db.execute(
            select(Bank).where(Bank.id == body.bank_id, Bank.user_id == current_user.id, Bank.is_archived == False)
        )
        bank = bank_result.scalar_one_or_none()
        if not bank:
            raise HTTPException(status_code=404, detail="Bank not found")
        bank_name = bank.name
    else:
        bank_name = None

    contribution = JarContribution(
        jar_id=jar_id,
        user_id=current_user.id,
        bank_id=body.bank_id,
        amount=body.amount,
        date=body.date,
        notes=body.notes,
    )
    db.add(contribution)
    await db.commit()
    await db.refresh(contribution)

    return JarContributionOut(
        id=contribution.id,
        jar_id=contribution.jar_id,
        bank_id=contribution.bank_id,
        bank_name=bank_name,
        amount=contribution.amount,
        date=contribution.date,
        notes=contribution.notes,
        created_at=contribution.created_at,
    )


@router.delete("/{jar_id}/contributions/{contribution_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contribution(
    jar_id: uuid.UUID,
    contribution_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(JarContribution).where(
            JarContribution.id == contribution_id,
            JarContribution.jar_id == jar_id,
            JarContribution.user_id == current_user.id,
        )
    )
    contribution = result.scalar_one_or_none()
    if not contribution:
        raise HTTPException(status_code=404, detail="Contribution not found")

    await db.delete(contribution)
    await db.commit()
