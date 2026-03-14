import uuid
from datetime import datetime
from pydantic import BaseModel


class ImportJobOut(BaseModel):
    id: uuid.UUID
    filename: str
    bank_hint: str | None
    llm_provider: str | None
    status: str
    total_rows: int | None
    parsed_rows: int | None
    error_message: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}
