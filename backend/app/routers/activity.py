from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.activity_log import ActivityLog
from app.schemas.activity_log import ActivityLogOut, ActivityLogListResponse

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=ActivityLogListResponse)
async def list_activity(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_result = await db.execute(
        select(func.count()).select_from(ActivityLog).where(ActivityLog.user_id == current_user.id)
    )
    total = total_result.scalar_one()

    offset = (page - 1) * per_page
    result = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.user_id == current_user.id)
        .order_by(ActivityLog.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    items = result.scalars().all()

    return ActivityLogListResponse(items=items, total=total, page=page, pages=-(-total // per_page))
