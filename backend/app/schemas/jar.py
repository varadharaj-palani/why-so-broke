import uuid
from datetime import datetime, date as DateType
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, field_validator


class JarCreate(BaseModel):
    name: str
    description: Optional[str] = None
    target_amount: Optional[Decimal] = None
    color: Optional[str] = None
    emoji: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name cannot be empty")
        return v

    @field_validator("target_amount")
    @classmethod
    def validate_target(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("target_amount must be positive")
        return v


class JarUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_amount: Optional[Decimal] = None
    color: Optional[str] = None
    emoji: Optional[str] = None

    @field_validator("target_amount")
    @classmethod
    def validate_target(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("target_amount must be positive")
        return v


class BankBreakdown(BaseModel):
    bank_id: Optional[uuid.UUID]
    bank_name: Optional[str]
    total: Decimal


class JarOut(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    target_amount: Optional[Decimal]
    color: Optional[str]
    emoji: Optional[str]
    is_archived: bool
    balance: Decimal
    bank_breakdown: list[BankBreakdown]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JarContributionCreate(BaseModel):
    bank_id: Optional[uuid.UUID] = None
    amount: Decimal
    date: DateType
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v == 0:
            raise ValueError("amount cannot be zero")
        return v


class JarContributionOut(BaseModel):
    id: uuid.UUID
    jar_id: uuid.UUID
    bank_id: Optional[uuid.UUID]
    bank_name: Optional[str] = None
    amount: Decimal
    date: DateType
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
