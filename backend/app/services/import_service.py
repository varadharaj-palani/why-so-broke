import hashlib
import os
from collections import Counter
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.models.import_job import ImportJob
from app.models.unverified_transaction import UnverifiedTransaction
from app.models.transaction import Transaction
from app.models.bank import Bank
from app.models.category import Category
from app.models.mode import Mode
from app.llm import get_llm_provider
from app.llm.pdf_parser import extract_pages, chunk_pages
from app.services import activity_service
from app.database import AsyncSessionLocal
from app.constants import CATEGORIES, MODES

CONFIDENCE_THRESHOLD = 0.9


def compute_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


async def process_import(job_id: str, user_id: str, file_path: str, bank_hint: str | None) -> None:
    """Background task: two-phase PDF import (extract → map), routes by confidence."""
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(ImportJob).where(ImportJob.id == job_id))
            job = result.scalar_one()

            pages = extract_pages(file_path)
            chunks = chunk_pages(pages, chunk_size=4)

            # Fetch user's categories/modes; fall back to constants if none seeded yet
            cat_result = await db.execute(
                select(Category).where(Category.user_id == user_id).order_by(Category.name)
            )
            user_categories = [c.name for c in cat_result.scalars().all()] or list(CATEGORIES)

            mode_result = await db.execute(
                select(Mode).where(Mode.user_id == user_id).order_by(Mode.name)
            )
            user_modes = [m.name for m in mode_result.scalars().all()] or list(MODES)

            provider = get_llm_provider()

            # ── Phase 1: Extract raw rows ────────────────────────────────────
            job.status = "extracting"
            await db.commit()

            all_raw_rows = []
            for i, chunk_text in enumerate(chunks):
                if not chunk_text.strip():
                    continue
                try:
                    raw_rows = await provider.extract_rows(chunk_text, bank_hint)
                    all_raw_rows.extend(raw_rows)
                    print(f"Chunk {i+1}: Extracted {len(raw_rows)} rows")
                except Exception as e:
                    print(f"Chunk {i+1} extraction failed: {e}")
                    continue

            job.extracted_data = [r.model_dump(mode="json") for r in all_raw_rows]
            await db.commit()

            # ── Phase 2: Map rows to categories/modes ────────────────────────
            job.status = "mapping"
            await db.commit()

            ROW_CHUNK_SIZE = 50
            all_transactions = []
            llm_bank_names: list[str] = []

            for i in range(0, len(all_raw_rows), ROW_CHUNK_SIZE):
                chunk = all_raw_rows[i : i + ROW_CHUNK_SIZE]
                try:
                    parsed = await provider.map_rows(chunk, user_categories, user_modes)
                    all_transactions.extend(parsed.transactions)
                    if parsed.bank_name:
                        llm_bank_names.append(parsed.bank_name)
                except Exception as e:
                    print(f"Chunk mapping failed: {e}")
                    continue

            # ── Resolve bank_id ──────────────────────────────────────────────
            bank_id = None

            # 1. Try user-provided bank_hint first
            if bank_hint:
                bank_result = await db.execute(
                    select(Bank).where(Bank.user_id == user_id, Bank.name.ilike(f"%{bank_hint}%"))
                )
                bank = bank_result.scalar_one_or_none()
                if bank:
                    bank_id = bank.id

            # 2. Fall back to most common LLM-inferred bank_name
            if bank_id is None and llm_bank_names:
                inferred_name = Counter(llm_bank_names).most_common(1)[0][0]
                bank_result = await db.execute(
                    select(Bank).where(Bank.user_id == user_id, Bank.name.ilike(f"%{inferred_name}%"))
                )
                bank = bank_result.scalar_one_or_none()
                if bank:
                    bank_id = bank.id

            # ── Route by confidence ──────────────────────────────────────────
            auto_approved = 0
            pending_verification = 0

            for tx in all_transactions:
                if tx.confidence >= CONFIDENCE_THRESHOLD:
                    # High confidence → write directly to transactions
                    row = Transaction(
                        user_id=user_id,
                        import_job_id=job_id,
                        date=tx.date,
                        type=tx.transaction_type.value,
                        description=tx.description,
                        category=tx.category.value,
                        amount=tx.amount,
                        bank_id=bank_id,
                        mode=tx.mode.value,
                    )
                    try:
                        async with db.begin_nested():  # savepoint — only this row rolls back on conflict
                            db.add(row)
                            await db.flush()
                        auto_approved += 1
                    except IntegrityError:
                        print(f"Duplicate skipped: {tx.date} {tx.description} {tx.amount}")
                else:
                    # Low confidence → unverified for manual review
                    row = UnverifiedTransaction(
                        user_id=user_id,
                        import_job_id=job_id,
                        date=tx.date,
                        type=tx.transaction_type.value,
                        description=tx.description,
                        category=tx.category.value,
                        amount=tx.amount,
                        bank_id=bank_id,
                        mode=tx.mode.value,
                        raw_text=tx.raw_text,
                        confidence=tx.confidence,
                        status="pending",
                    )
                    db.add(row)
                    pending_verification += 1

            job.status = "completed"
            job.total_rows = len(all_transactions)
            job.parsed_rows = auto_approved + pending_verification
            job.completed_at = datetime.now(timezone.utc)

            await db.flush()
            await activity_service.log(
                db, user_id, "import_completed", "import_job", job_id,
                {
                    "total_rows": len(all_transactions),
                    "auto_approved": auto_approved,
                    "pending_verification": pending_verification,
                    "filename": job.filename,
                }
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
