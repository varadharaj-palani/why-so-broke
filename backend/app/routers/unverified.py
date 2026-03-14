import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.unverified_transaction import UnverifiedTransaction
from app.schemas.unverified import UnverifiedUpdate, UnverifiedOut, UnverifiedListResponse, BulkActionRequest
from app.services import verification_service

router = APIRouter(prefix="/unverified", tags=["unverified"])


@router.get("", response_model=UnverifiedListResponse)
async def list_unverified(
    import_job_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conditions = [UnverifiedTransaction.user_id == current_user.id]
    if import_job_id:
        conditions.append(UnverifiedTransaction.import_job_id == import_job_id)
    if status:
        conditions.append(UnverifiedTransaction.status == status)

    total_result = await db.execute(
        select(func.count()).select_from(UnverifiedTransaction).where(and_(*conditions))
    )
    total = total_result.scalar_one()

    offset = (page - 1) * per_page
    result = await db.execute(
        select(UnverifiedTransaction)
        .options(selectinload(UnverifiedTransaction.bank))
        .where(and_(*conditions))
        .order_by(UnverifiedTransaction.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    items = result.scalars().all()

    return UnverifiedListResponse(items=items, total=total, page=page, pages=-(-total // per_page))


@router.put("/{unverified_id}", response_model=UnverifiedOut)
async def update_unverified(
    unverified_id: uuid.UUID,
    body: UnverifiedUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UnverifiedTransaction)
        .options(selectinload(UnverifiedTransaction.bank))
        .where(UnverifiedTransaction.id == unverified_id, UnverifiedTransaction.user_id == current_user.id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    if row.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending transactions can be edited")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(row, field, value)

    await db.commit()
    await db.refresh(row)
    return row


async def _get_pending(db: AsyncSession, unverified_id: uuid.UUID, user_id: uuid.UUID) -> UnverifiedTransaction:
    result = await db.execute(
        select(UnverifiedTransaction).where(
            UnverifiedTransaction.id == unverified_id,
            UnverifiedTransaction.user_id == user_id,
            UnverifiedTransaction.status == "pending",
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Pending transaction not found")
    return row


@router.post("/{unverified_id}/verify")
async def verify_one(
    unverified_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = await _get_pending(db, unverified_id, current_user.id)
    tx = await verification_service.verify_transaction(db, row)
    await db.commit()
    return {"status": "verified", "transaction_id": str(tx.id)}


@router.post("/{unverified_id}/reject")
async def reject_one(
    unverified_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = await _get_pending(db, unverified_id, current_user.id)
    await verification_service.reject_transaction(db, row)
    await db.commit()
    return {"status": "rejected"}


@router.post("/bulk-verify")
async def bulk_verify(
    body: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verified = 0
    for uid in body.ids:
        try:
            row = await _get_pending(db, uid, current_user.id)
            await verification_service.verify_transaction(db, row)
            verified += 1
        except HTTPException:
            continue
    await db.commit()
    return {"verified": verified}


@router.post("/bulk-reject")
async def bulk_reject(
    body: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rejected = 0
    for uid in body.ids:
        try:
            row = await _get_pending(db, uid, current_user.id)
            await verification_service.reject_transaction(db, row)
            rejected += 1
        except HTTPException:
            continue
    await db.commit()
    return {"rejected": rejected}
