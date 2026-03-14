import uuid
from datetime import datetime
from datetime import date as DateType
from decimal import Decimal
from pydantic import BaseModel
from app.schemas.transaction import BankInfo


class UnverifiedUpdate(BaseModel):
    date: DateType | None = None
    type: str | None = None
    description: str | None = None
    category: str | None = None
    amount: Decimal | None = None
    bank_id: uuid.UUID | None = None
    transfer_to_bank_id: uuid.UUID | None = None
    mode: str | None = None


class BulkActionRequest(BaseModel):
    ids: list[uuid.UUID]


class UnverifiedOut(BaseModel):
    id: uuid.UUID
    import_job_id: uuid.UUID
    date: DateType | None
    type: str | None
    description: str | None
    category: str | None
    amount: Decimal | None
    bank_id: uuid.UUID | None
    bank: BankInfo | None
    transfer_to_bank_id: uuid.UUID | None
    mode: str | None
    raw_text: str | None
    confidence: Decimal | None
    status: str
    created_at: datetime
    verified_at: datetime | None

    model_config = {"from_attributes": True}


class UnverifiedListResponse(BaseModel):
    items: list[UnverifiedOut]
    total: int
    page: int
    pages: int
