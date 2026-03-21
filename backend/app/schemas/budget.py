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
    end_date: DateType
    amount: Decimal

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in CATEGORIES:
            raise ValueError(f"category must be one of {CATEGORIES}")
        return v

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("amount must be positive")
        return v

    @model_validator(mode="after")
    def validate_dates(self) -> "BudgetCreate":
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class BudgetUpdate(BaseModel):
    amount: Optional[Decimal] = None
    start_date: Optional[DateType] = None
    end_date: Optional[DateType] = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("amount must be positive")
        return v


class BudgetOut(BaseModel):
    id: uuid.UUID
    category: str
    month: Optional[DateType] = None
    start_date: Optional[DateType] = None
    end_date: Optional[DateType] = None
    amount: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BudgetProgress(BaseModel):
    category: str
    budget_amount: Decimal
    spent_amount: Decimal
    percentage: float
    start_date: Optional[DateType] = None
    end_date: Optional[DateType] = None
