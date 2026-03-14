import uuid
from datetime import datetime
from datetime import date as DateType
from decimal import Decimal
from pydantic import BaseModel, field_validator
from app.constants import CATEGORIES


class BudgetCreate(BaseModel):
    category: str
    month: DateType
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


class BudgetUpdate(BaseModel):
    amount: Decimal

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("amount must be positive")
        return v


class BudgetOut(BaseModel):
    id: uuid.UUID
    category: str
    month: DateType
    amount: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BudgetProgress(BaseModel):
    category: str
    budget_amount: Decimal
    spent_amount: Decimal
    percentage: float
