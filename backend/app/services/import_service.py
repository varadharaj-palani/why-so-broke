import hashlib
import os
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.import_job import ImportJob
from app.models.unverified_transaction import UnverifiedTransaction
from app.models.bank import Bank
from app.models.category import Category
from app.models.mode import Mode
from app.llm import get_llm_provider
from app.llm.pdf_parser import extract_pages, chunk_pages
from app.services import activity_service
from app.database import AsyncSessionLocal
from app.constants import CATEGORIES, MODES


def compute_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


async def process_import(job_id: str, user_id: str, file_path: str, bank_hint: str | None) -> None:
    """Background task: two-phase PDF import (extract → map), creates unverified transactions."""
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(ImportJob).where(ImportJob.id == job_id))
            job = result.scalar_one()

            pages = extract_pages(file_path)
            chunks = chunk_pages(pages, chunk_size=4)

            provider = get_llm_provider()

            # ── Phase 1: Extract raw rows ────────────────────────────────────
            job.status = "extracting"
            await db.commit()

            all_raw_rows = []
            for chunk_text in chunks:
                if not chunk_text.strip():
                    continue
                try:
                    raw_rows = await provider.extract_rows(chunk_text, bank_hint)
                    all_raw_rows.extend(raw_rows)
                except Exception as e:
                    print(f"Chunk extraction failed: {e}")
                    continue

            job.extracted_data = [r.model_dump(mode="json") for r in all_raw_rows]
            await db.commit()

            # ── Phase 2: Map rows to categories/modes ────────────────────────
            job.status = "mapping"
            await db.commit()

            # Fetch user's categories/modes; fall back to constants if none seeded yet
            cat_result = await db.execute(
                select(Category).where(Category.user_id == user_id).order_by(Category.name)
            )
            user_categories = [c.name for c in cat_result.scalars().all()]
            if not user_categories:
                user_categories = list(CATEGORIES)

            mode_result = await db.execute(
                select(Mode).where(Mode.user_id == user_id).order_by(Mode.name)
            )
            user_modes = [m.name for m in mode_result.scalars().all()]
            if not user_modes:
                user_modes = list(MODES)

            ROW_CHUNK_SIZE = 50
            all_transactions = []
            for i in range(0, len(all_raw_rows), ROW_CHUNK_SIZE):
                chunk = all_raw_rows[i : i + ROW_CHUNK_SIZE]
                try:
                    parsed = await provider.map_rows(chunk, user_categories, user_modes)
                    all_transactions.extend(parsed.transactions)
                except Exception as e:
                    print(f"Chunk mapping failed: {e}")
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
            if os.path.exists(file_path):
                os.remove(file_path)
