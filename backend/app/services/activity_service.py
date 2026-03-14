import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.activity_log import ActivityLog


async def log(
    db: AsyncSession,
    user_id: uuid.UUID,
    action: str,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
    details: dict | None = None,
) -> ActivityLog:
    entry = ActivityLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
    )
    db.add(entry)
    await db.flush()
    return entry
