from datetime import date as DateType
from decimal import Decimal
from pydantic import BaseModel


class SummaryOut(BaseModel):
    total_income: Decimal
    total_expense: Decimal
    net: Decimal
    transaction_count: int


class CategoryBreakdown(BaseModel):
    category: str
    total: Decimal


class MonthlyTrendItem(BaseModel):
    month: str
    income: Decimal
    expense: Decimal


class ModeBreakdown(BaseModel):
    mode: str
    total: Decimal


class DailySpendItem(BaseModel):
    date: DateType
    total: Decimal
