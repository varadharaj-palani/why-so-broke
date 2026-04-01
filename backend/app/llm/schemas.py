from datetime import date as DateType
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel, Field, create_model


# ── Fixed Enums ────────────────────────────────────────────────────────────────

class Direction(str, Enum):
    DEBIT  = "debit"   # money left the account
    CREDIT = "credit"  # money entered the account


class TransactionType(str, Enum):
    EXPENSE  = "expense"
    INCOME   = "income"
    TRANSFER = "transfer"


# ── Phase 1: Extraction ───────────────────────────────────────────────────────

class ExtractedRow(BaseModel):
    date: DateType = Field(
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


# ── Phase 2: Classification (dynamic) ────────────────────────────────────────

def build_classify_model(CategoryEnum: type, ModeEnum: type) -> type[BaseModel]:
    """
    Build ClassifiedTransaction + ClassifiedStatement dynamically using the
    provided runtime Enum types for category and mode.
    pydantic-ai will include the enum values in the JSON schema, forcing the
    LLM to pick a valid value.
    """
    ClassifiedTransaction = create_model(
        "ClassifiedTransaction",
        date=(DateType, Field(description="Transaction date.")),
        description=(str, Field(description="Clean merchant or payee name.")),
        amount=(Decimal, Field(ge=0, description="Positive transaction amount.")),
        transaction_type=(
            TransactionType,
            Field(
                alias="type",
                description=(
                    "EXPENSE for debits, purchases, and withdrawals. "
                    "INCOME for credits, salary deposits, and refunds. "
                    "TRANSFER for internal fund movements between the user's own bank accounts."
                ),
            ),
        ),
        category=(
            CategoryEnum,
            Field(
                description=(
                    "Pick the best matching category from the provided list. "
                    "Common Indian mappings — "
                    "Swiggy/Zomato/restaurant→Food & Dining, "
                    "Amazon/Flipkart/Myntra→Shopping, "
                    "Ola/Uber/Rapido/Metro/IRCTC→Transport, "
                    "HPCL/BPCL/IOC/petrol→Fuel, "
                    "Netflix/Hotstar/Spotify/Prime→Subscriptions, "
                    "Hospital/Pharmacy/medical→Health, "
                    "School/College/Udemy/course→Education, "
                    "Electricity/Water/Gas/BESCOM→Utilities, "
                    "LIC/Star Health/insurance→Insurance, "
                    "EMI/Home Loan/loan repayment→EMI/Loans, "
                    "SIP/Mutual Fund/Zerodha/Groww→Investments, "
                    "salary/stipend credit→Salary."
                ),
            ),
        ),
        mode=(
            ModeEnum,
            Field(
                description=(
                    "Infer payment mode from the description. "
                    "UPI/PhonePe/GPay/Paytm/BHIM/@→UPI, "
                    "NEFT/IMPS/RTGS/NACH→NEFT/IMPS, "
                    "ATM withdrawal/POS/Debit→Debit Card, "
                    "CC/Credit Card→Credit Card, "
                    "INB/Internet Banking→Net Banking, "
                    "CASH/cash withdrawal→Cash."
                ),
            ),
        ),
        confidence=(
            float,
            Field(
                ge=0.0, le=1.0, default=0.8,
                description="Your confidence in the category and type classification. Use a value below 0.5 when genuinely uncertain.",
            ),
        ),
        raw_text=(str, Field(default="", description="Carry over the raw_text value from the corresponding Phase 1 row.")),
    )

    ClassifiedStatement = create_model(
        "ClassifiedStatement",
        bank_name=(
            str,
            Field(description="Name of the bank inferred from the statement content, header, or the bank hint provided."),
        ),
        transactions=(
            list[ClassifiedTransaction],  # type: ignore[valid-type]
            Field(description="All classified transactions. Must match the count of input rows."),
        ),
    )

    return ClassifiedStatement
