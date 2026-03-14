import asyncio
import json
import anthropic
from app.llm.base import LLMProvider
from app.llm.schemas import ParsedStatement, ParsedTransaction
from app.constants import CATEGORIES, MODES
from app.config import settings


SYSTEM_PROMPT = """You are a financial document parser specializing in Indian bank statements.
Extract ALL transactions from the bank statement text provided.

Rules:
- date: Extract in YYYY-MM-DD format. If year is ambiguous, use current year.
- type: "expense" for debits/withdrawals/purchases, "income" for credits/deposits/salary, "transfer" for fund transfers between accounts
- category: MUST be exactly one of: {categories}
- mode: MUST be exactly one of: {modes}. Infer from description:
  - "UPI" if description contains UPI, PhonePe, GPay, Paytm, BHIM, @
  - "NEFT/IMPS" if description contains NEFT, RTGS, IMPS, NACH
  - "Net Banking" if description contains INB, Internet Banking
  - "Credit Card" if description contains CC, Credit
  - "Debit Card" if description contains ATM, POS, Debit
  - "Cash" if description contains CASH, ATM withdrawal
- amount: Always positive number, strip currency symbols and commas
- confidence: 0.0-1.0, your confidence in category and type mapping
- raw_text: The exact original text/row from the statement

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

Return ONLY a JSON object matching this schema:
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
      "confidence": 0.0-1.0,
      "raw_text": "original text"
    }}
  ]
}}"""


class ClaudeProvider(LLMProvider):
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    def _build_prompt(self, bank_hint: str | None) -> str:
        return SYSTEM_PROMPT.format(
            categories=", ".join(CATEGORIES),
            modes=", ".join(MODES),
        ) + f"\n\nBank: {bank_hint or 'Unknown Indian Bank'}"

    async def parse_statement(self, text: str, bank_hint: str | None = None) -> ParsedStatement:
        return await self._parse_with_retry(text, bank_hint, retries=2)

    async def _parse_with_retry(self, text: str, bank_hint: str | None, retries: int) -> ParsedStatement:
        last_error = None
        for attempt in range(retries + 1):
            try:
                response = await self.client.messages.create(
                    model="claude-opus-4-6",
                    max_tokens=4096,
                    system=self._build_prompt(bank_hint),
                    messages=[{"role": "user", "content": f"Parse this bank statement:\n\n{text}"}],
                )
                content = response.content[0].text
                return self._parse_response(content)
            except (anthropic.APITimeoutError, anthropic.APIStatusError) as e:
                last_error = e
                if attempt < retries:
                    await asyncio.sleep(2 ** attempt * 2)
            except Exception as e:
                last_error = e
                break

        raise RuntimeError(f"LLM parsing failed after {retries + 1} attempts: {last_error}")

    def _parse_response(self, content: str) -> ParsedStatement:
        # Extract JSON from response (handles markdown code blocks)
        content = content.strip()
        if "```" in content:
            start = content.find("{")
            end = content.rfind("}") + 1
            content = content[start:end]

        try:
            data = json.loads(content)
            # Validate and fix categories/modes
            validated_transactions = []
            for t in data.get("transactions", []):
                if t.get("category") not in CATEGORIES:
                    t["category"] = "Other"
                    t["confidence"] = min(t.get("confidence", 0.5), 0.3)
                if t.get("mode") not in MODES:
                    t["mode"] = "UPI"
                    t["confidence"] = min(t.get("confidence", 0.5), 0.3)
                try:
                    validated_transactions.append(ParsedTransaction(**t))
                except Exception:
                    continue

            return ParsedStatement(
                bank_name=data.get("bank_name", ""),
                transactions=validated_transactions,
            )
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse LLM JSON response: {e}")
