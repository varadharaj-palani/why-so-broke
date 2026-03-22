from datetime import date
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────────────────

class Direction(str, Enum):
    DEBIT  = "debit"   # money left the account
    CREDIT = "credit"  # money entered the account


class TransactionType(str, Enum):
    EXPENSE  = "expense"
    INCOME   = "income"
    TRANSFER = "transfer"


class CategoryEnum(str, Enum):
    """Mirrors constants.CATEGORIES exactly. Values are the DB-stored strings."""
    FOOD_AND_DINING = "Food & Dining"
    GROCERIES       = "Groceries"
    TRANSPORT       = "Transport"
    FUEL            = "Fuel"
    RENT            = "Rent"
    UTILITIES       = "Utilities"
    SHOPPING        = "Shopping"
    ENTERTAINMENT   = "Entertainment"
    HEALTH          = "Health"
    EDUCATION       = "Education"
    SUBSCRIPTIONS   = "Subscriptions"
    INSURANCE       = "Insurance"
    EMI_LOANS       = "EMI/Loans"
    INVESTMENTS     = "Investments"
    SALARY          = "Salary"
    FREELANCE       = "Freelance"
    TRANSFERS       = "Transfers"
    OTHER           = "Other"


class ModeEnum(str, Enum):
    """Mirrors constants.MODES exactly. Values are the DB-stored strings."""
    UPI         = "UPI"
    CASH        = "Cash"
    CREDIT_CARD = "Credit Card"
    DEBIT_CARD  = "Debit Card"
    NET_BANKING = "Net Banking"
    NEFT_IMPS   = "NEFT/IMPS"


# ── Phase 1: Extraction ───────────────────────────────────────────────────────

class ExtractedRow(BaseModel):
    date: date = Field(
        description="Transaction date. If only day/month is visible, assume the current year."
    )
    description: str = Field(
        description="Full merchant or payee name and transaction description exactly as it appears in the statement."
    )
    direction: Direction = Field(
        description="DEBIT if money left the account (withdrawal, purchase, payment). CREDIT if money entered the account (deposit, salary, refund)."
    )
    amount: Decimal = Field(
        ge=0,
        description="Positive transaction amount. Never negative."
    )
    raw_text: str = Field(
        default="",
        description="Exact original line or row from the statement, preserving all formatting."
    )


class ExtractedStatement(BaseModel):
    """Wrapper so the agent returns a single typed object instead of a bare list."""
    rows: list[ExtractedRow] = Field(
        description="Every transaction row from the statement in chronological order. Do not skip, merge, or summarise any rows."
    )


# ── Phase 2: Classification ───────────────────────────────────────────────────

class ClassifiedTransaction(BaseModel):
    date: date = Field(
        description="Transaction date."
    )
    description: str = Field(
        description="Clean merchant or payee name."
    )
    amount: Decimal = Field(
        ge=0,
        description="Positive transaction amount."
    )
    type: TransactionType = Field(
        description=(
            "EXPENSE for debits, purchases, and withdrawals. "
            "INCOME for credits, salary deposits, and refunds. "
            "TRANSFER for internal fund movements between the user's own bank accounts."
        )
    )
    category: CategoryEnum = Field(
        description=(
            "Pick the best matching category. Use OTHER when nothing fits clearly. "
            "Common Indian mappings — "
            "Swiggy/Zomato/restaurant→FOOD_AND_DINING, "
            "Amazon/Flipkart/Myntra→SHOPPING, "
            "Ola/Uber/Rapido/Metro/IRCTC→TRANSPORT, "
            "HPCL/BPCL/IOC/petrol→FUEL, "
            "Netflix/Hotstar/Spotify/Prime→SUBSCRIPTIONS, "
            "Hospital/Pharmacy/medical→HEALTH, "
            "School/College/Udemy/course→EDUCATION, "
            "Electricity/Water/Gas/BESCOM→UTILITIES, "
            "LIC/Star Health/insurance→INSURANCE, "
            "EMI/Home Loan/loan repayment→EMI_LOANS, "
            "SIP/Mutual Fund/Zerodha/Groww→INVESTMENTS, "
            "salary/stipend credit→SALARY."
        )
    )
    mode: ModeEnum = Field(
        description=(
            "Infer payment mode from the description. "
            "UPI/PhonePe/GPay/Paytm/BHIM/@→UPI, "
            "NEFT/IMPS/RTGS/NACH→NEFT_IMPS, "
            "ATM withdrawal/POS/Debit→DEBIT_CARD, "
            "CC/Credit Card→CREDIT_CARD, "
            "INB/Internet Banking→NET_BANKING, "
            "CASH/cash withdrawal→CASH."
        )
    )
    confidence: float = Field(
        ge=0.0, le=1.0, default=0.8,
        description="Your confidence in the category and type classification. Use a value below 0.5 when genuinely uncertain."
    )
    raw_text: str = Field(
        default="",
        description="Carry over the raw_text value from the corresponding Phase 1 row."
    )


class ClassifiedStatement(BaseModel):
    bank_name: str = Field(
        description="Name of the bank inferred from the statement content, header, or the bank hint provided."
    )
    transactions: list[ClassifiedTransaction] = Field(
        description="All classified transactions. Must match the count of input rows."
    )
