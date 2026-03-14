import uuid
from datetime import datetime
from pydantic import BaseModel


class ActivityLogOut(BaseModel):
    id: uuid.UUID
    action: str
    entity_type: str | None
    entity_id: uuid.UUID | None
    details: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ActivityLogListResponse(BaseModel):
    items: list[ActivityLogOut]
    total: int
    page: int
    pages: int
