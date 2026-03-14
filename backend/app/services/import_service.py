import hashlib
import os
import tempfile
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.import_job import ImportJob
from app.models.unverified_transaction import UnverifiedTransaction
from app.models.bank import Bank
from app.llm import get_llm_provider
from app.llm.pdf_parser import extract_pages, chunk_pages
from app.services import activity_service
from app.database import AsyncSessionLocal
from app.config import settings


def compute_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


async def process_import(job_id: str, user_id: str, file_path: str, bank_hint: str | None) -> None:
    """Background task: parse PDF, create unverified transactions, update job status."""
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(ImportJob).where(ImportJob.id == job_id))
            job = result.scalar_one()

            pages = extract_pages(file_path)
            chunks = chunk_pages(pages, chunk_size=4)

            provider = get_llm_provider()
            all_transactions = []

            for chunk_text in chunks:
                if not chunk_text.strip():
                    continue
                try:
                    statement = await provider.parse_statement(chunk_text, bank_hint)
                    all_transactions.extend(statement.transactions)
                except Exception as e:
                    # Partial failure: log but continue with other chunks
                    print(f"Chunk parsing failed: {e}")
                    continue

            # Try to match bank_hint to a user bank
            bank_id = None
            if bank_hint:
                bank_result = await db.execute(
                    select(Bank).where(Bank.user_id == user_id, Bank.name.ilike(f"%{bank_hint}%"))
                )
                bank = bank_result.scalar_one_or_none()
                if bank:
                    bank_id = bank.id

            for tx in all_transactions:
                row = UnverifiedTransaction(
                    user_id=user_id,
                    import_job_id=job_id,
                    date=tx.date,
                    type=tx.type,
                    description=tx.description,
                    category=tx.category,
                    amount=tx.amount,
                    bank_id=bank_id,
                    mode=tx.mode,
                    raw_text=tx.raw_text,
                    confidence=tx.confidence,
                    status="pending",
                )
                db.add(row)

            job.status = "completed"
            job.total_rows = len(all_transactions)
            job.parsed_rows = len(all_transactions)
            job.completed_at = datetime.now(timezone.utc)

            await db.flush()
            await activity_service.log(
                db, user_id, "import_completed", "import_job", job_id,
                {"total_rows": len(all_transactions), "filename": job.filename}
            )
            await db.commit()

        except Exception as e:
            async with AsyncSessionLocal() as err_db:
                err_result = await err_db.execute(select(ImportJob).where(ImportJob.id == job_id))
                err_job = err_result.scalar_one_or_none()
                if err_job:
                    err_job.status = "failed"
                    err_job.error_message = str(e)
                    err_job.completed_at = datetime.now(timezone.utc)
                    await err_db.commit()
        finally:
            # Always delete the temp file
            if os.path.exists(file_path):
                os.remove(file_path)
