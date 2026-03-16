import asyncio
import json
import anthropic
from app.llm.base import LLMProvider
from app.llm.schemas import ParsedStatement, ParsedTransaction, RawRow
from app.config import settings


EXTRACT_SYSTEM_PROMPT = """You are a financial document parser specializing in Indian bank statements.
Extract ALL transaction rows from the bank statement text provided.
Do NOT classify or categorize — just extract raw data.

For each transaction row output:
- date: YYYY-MM-DD format (if year is ambiguous use current year)
- description: merchant/payee name and full transaction description
- debit: amount debited/withdrawn as a positive number (or null if not a debit)
- credit: amount credited/deposited as a positive number (or null if not a credit)
- raw_text: the exact original text/row from the statement

Return ONLY a JSON array:
[
  {
    "date": "YYYY-MM-DD",
    "description": "string",
    "debit": null,
    "credit": null,
    "raw_text": "original text"
  }
]"""


MAP_SYSTEM_PROMPT = """You are a financial transaction classifier specializing in Indian bank transactions.
Classify each extracted transaction row.

Rules:
- type: "expense" for debits/withdrawals/purchases, "income" for credits/deposits/salary, "transfer" for internal fund transfers between accounts
- category: MUST be exactly one of: {categories}
- mode: MUST be exactly one of: {modes}. Infer from description:
  - "UPI" if description contains UPI, PhonePe, GPay, Paytm, BHIM, @
  - "NEFT/IMPS" if description contains NEFT, RTGS, IMPS, NACH
  - "Net Banking" if description contains INB, Internet Banking
  - "Credit Card" if description contains CC, Credit
  - "Debit Card" if description contains ATM, POS, Debit
  - "Cash" if description contains CASH, ATM withdrawal
- amount: use debit value if it's a debit, credit value if it's a credit
- confidence: 0.0-1.0, your confidence in the category/type mapping

Common Indian category mappings:
- Swiggy, Zomato, restaurant names → "Food & Dining"
- Amazon, Flipkart, Myntra, Meesho, Nykaa → "Shopping"
- Ola, Uber, Rapido, Metro, IRCTC, MakeMyTrip → "Transport"
- HPCL, BPCL, IOC, HP Petrol, Indian Oil → "Fuel"
- Netflix, Hotstar, Spotify, Prime, YouTube → "Subscriptions"
- Gym, Hospital, Pharmacy, Medical → "Health"
- School, College, Course, Udemy → "Education"
- Electricity, Water, Gas, BESCOM, BWSSB → "Utilities"
- LIC, Star Health, insurance → "Insurance"
- EMI, Loan repayment, Home Loan → "EMI/Loans"
- Mutual Fund, SIP, Stocks, Zerodha, Groww → "Investments"
- Salary, stipend credit → "Salary"
- If unsure → "Other" with confidence < 0.5

Return ONLY a JSON object:
{{
  "bank_name": "string",
  "transactions": [
    {{
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": 0.00,
      "type": "expense|income|transfer",
      "category": "one of the categories",
      "mode": "one of the modes",
      "confidence": 0.0,
      "raw_text": "original text"
    }}
  ]
}}"""


class ClaudeProvider(LLMProvider):
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def extract_rows(self, text: str, bank_hint: str | None = None) -> list[RawRow]:
        system = EXTRACT_SYSTEM_PROMPT + f"\n\nBank: {bank_hint or 'Unknown Indian Bank'}"
        last_error = None
        for attempt in range(3):
            try:
                response = await self.client.messages.create(
                    model="claude-opus-4-6",
                    max_tokens=8192,
                    system=system,
                    messages=[{"role": "user", "content": f"Extract all transactions from this bank statement:\n\n{text}"}],
                )
                content = response.content[0].text.strip()
                if "```" in content:
                    start = content.find("[")
                    end = content.rfind("]") + 1
                    content = content[start:end]
                data = json.loads(content)
                return [RawRow(**row) for row in data if isinstance(row, dict)]
            except (anthropic.APITimeoutError, anthropic.APIStatusError) as e:
                last_error = e
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt * 2)
            except Exception as e:
                last_error = e
                break
        raise RuntimeError(f"Claude extraction failed after 3 attempts: {last_error}")

    async def map_rows(self, rows: list[RawRow], categories: list[str], modes: list[str]) -> ParsedStatement:
        system = MAP_SYSTEM_PROMPT.format(
            categories=", ".join(categories),
            modes=", ".join(modes),
        )
        rows_json = json.dumps([r.model_dump(mode="json") for r in rows], indent=2)
        last_error = None
        for attempt in range(3):
            try:
                response = await self.client.messages.create(
                    model="claude-opus-4-6",
                    max_tokens=8192,
                    system=system,
                    messages=[{"role": "user", "content": f"Classify these transactions:\n\n{rows_json}"}],
                )
                content = response.content[0].text.strip()
                return self._parse_map_response(content, categories, modes)
            except (anthropic.APITimeoutError, anthropic.APIStatusError) as e:
                last_error = e
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt * 2)
            except Exception as e:
                last_error = e
                break
        raise RuntimeError(f"Claude mapping failed after 3 attempts: {last_error}")

    def _parse_map_response(self, content: str, categories: list[str], modes: list[str]) -> ParsedStatement:
        if "```" in content:
            start = content.find("{")
            end = content.rfind("}") + 1
            content = content[start:end]
        data = json.loads(content)
        validated = []
        for t in data.get("transactions", []):
            if t.get("category") not in categories:
                t["category"] = categories[-1] if categories else "Other"
                t["confidence"] = min(t.get("confidence", 0.5), 0.3)
            if t.get("mode") not in modes:
                t["mode"] = modes[0] if modes else "UPI"
                t["confidence"] = min(t.get("confidence", 0.5), 0.3)
            try:
                validated.append(ParsedTransaction(**t))
            except Exception:
                continue
        return ParsedStatement(bank_name=data.get("bank_name", ""), transactions=validated)
