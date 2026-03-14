import uuid
from datetime import datetime
from datetime import date as DateType
from decimal import Decimal
from pydantic import BaseModel, field_validator
from app.constants import CATEGORIES, MODES, TYPES


class TransactionCreate(BaseModel):
    date: DateType
    type: str
    description: str
    category: str
    amount: Decimal
    bank_id: uuid.UUID | None = None
    transfer_to_bank_id: uuid.UUID | None = None
    mode: str
    notes: str | None = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in TYPES:
            raise ValueError(f"type must be one of {TYPES}")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in CATEGORIES:
            raise ValueError(f"category must be one of {CATEGORIES}")
        return v

    @field_validator("mode")
    @classmethod
    def validate_mode(cls, v: str) -> str:
        if v not in MODES:
            raise ValueError(f"mode must be one of {MODES}")
        return v

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("amount must be positive")
        return v


class TransactionUpdate(BaseModel):
    date: DateType | None = None
    description: str | None = None
    category: str | None = None
    amount: Decimal | None = None
    bank_id: uuid.UUID | None = None
    mode: str | None = None
    notes: str | None = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str | None) -> str | None:
        if v is not None and v not in CATEGORIES:
            raise ValueError(f"category must be one of {CATEGORIES}")
        return v

    @field_validator("mode")
    @classmethod
    def validate_mode(cls, v: str | None) -> str | None:
        if v is not None and v not in MODES:
            raise ValueError(f"mode must be one of {MODES}")
        return v

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v <= 0:
            raise ValueError("amount must be positive")
        return v


class BankInfo(BaseModel):
    id: uuid.UUID
    name: str
    short_code: str | None

    model_config = {"from_attributes": True}


class TransactionOut(BaseModel):
    id: uuid.UUID
    date: DateType
    type: str
    description: str
    category: str
    amount: Decimal
    bank_id: uuid.UUID | None
    bank: BankInfo | None
    transfer_to_bank_id: uuid.UUID | None
    transfer_to_bank: BankInfo | None
    transfer_group_id: uuid.UUID | None
    mode: str
    notes: str | None
    import_job_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TransactionListResponse(BaseModel):
    items: list[TransactionOut]
    total: int
    page: int
    pages: int
