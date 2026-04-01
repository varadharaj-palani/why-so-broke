import uuid
from datetime import datetime
from datetime import date as DateType
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, field_validator, model_validator
from app.constants import CATEGORIES


class BudgetCreate(BaseModel):
    category: str
    start_date: DateType
    cycle_days: int
    amount: Decimal

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in CATEGORIES:
            raise ValueError(f"category must be one of {CATEGORIES}")
        return v

    @field_validator("cycle_days")
    @classmethod
    def validate_cycle_days(cls, v: int) -> int:
        if v < 1:
            raise ValueError("cycle_days must be at least 1")
        return v

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("amount must be positive")
        return v


class BudgetUpdate(BaseModel):
    amount: Optional[Decimal] = None
    start_date: Optional[DateType] = None
    cycle_days: Optional[int] = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("amount must be positive")
        return v

    @field_validator("cycle_days")
    @classmethod
    def validate_cycle_days(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 1:
            raise ValueError("cycle_days must be at least 1")
        return v


class BudgetOut(BaseModel):
    id: uuid.UUID
    category: str
    start_date: Optional[DateType] = None
    end_date: Optional[DateType] = None
    cycle_days: Optional[int] = None
    amount: Decimal
    created_at: datetime
    updated_at: datetime

    @model_validator(mode='after')
    def compute_cycle_days(self) -> "BudgetOut":
        if self.start_date and self.end_date and self.cycle_days is None:
            self.cycle_days = (self.end_date - self.start_date).days + 1
        return self

    model_config = {"from_attributes": True}


class BudgetProgress(BaseModel):
    category: str
    budget_amount: Decimal
    spent_amount: Decimal
    percentage: float
    current_cycle_start: DateType
    current_cycle_end: DateType
