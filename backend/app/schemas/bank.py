import uuid
from datetime import datetime
from pydantic import BaseModel


class BankCreate(BaseModel):
    name: str
    short_code: str | None = None


class BankUpdate(BaseModel):
    name: str | None = None
    short_code: str | None = None
    is_active: bool | None = None


class BankOut(BaseModel):
    id: uuid.UUID
    name: str
    short_code: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
