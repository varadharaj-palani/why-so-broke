from datetime import date
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, Field


class ParsedTransaction(BaseModel):
    date: date
    description: str
    amount: Decimal = Field(ge=0)
    type: Literal["expense", "income", "transfer"]
    category: str
    mode: str
    confidence: float = Field(ge=0.0, le=1.0, default=0.8)
    raw_text: str = ""


class ParsedStatement(BaseModel):
    bank_name: str = ""
    transactions: list[ParsedTransaction] = []
