import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.unverified_transaction import UnverifiedTransaction
from app.models.transaction import Transaction
from app.services import activity_service


async def verify_transaction(
    db: AsyncSession, unverified: UnverifiedTransaction
) -> Transaction:
    """Copy unverified row into transactions table. Handles transfer dual-row creation."""
    if unverified.type == "transfer":
        group_id = uuid.uuid4()
        # Row 1: source bank
        tx1 = Transaction(
            user_id=unverified.user_id,
            date=unverified.date,
            type="transfer",
            description=unverified.description or "",
            category=unverified.category or "Transfers",
            amount=unverified.amount,
            bank_id=unverified.bank_id,
            transfer_to_bank_id=unverified.transfer_to_bank_id,
            transfer_group_id=group_id,
            mode=unverified.mode or "NEFT/IMPS",
            notes=None,
            import_job_id=unverified.import_job_id,
        )
        # Row 2: destination bank
        tx2 = Transaction(
            user_id=unverified.user_id,
            date=unverified.date,
            type="transfer",
            description=unverified.description or "",
            category=unverified.category or "Transfers",
            amount=unverified.amount,
            bank_id=unverified.transfer_to_bank_id,
            transfer_to_bank_id=unverified.bank_id,
            transfer_group_id=group_id,
            mode=unverified.mode or "NEFT/IMPS",
            notes=None,
            import_job_id=unverified.import_job_id,
        )
        db.add(tx1)
        db.add(tx2)
        main_tx = tx1
    else:
        main_tx = Transaction(
            user_id=unverified.user_id,
            date=unverified.date,
            type=unverified.type or "expense",
            description=unverified.description or "",
            category=unverified.category or "Other",
            amount=unverified.amount,
            bank_id=unverified.bank_id,
            transfer_to_bank_id=None,
            transfer_group_id=None,
            mode=unverified.mode or "UPI",
            notes=None,
            import_job_id=unverified.import_job_id,
        )
        db.add(main_tx)

    await db.delete(unverified)
    await db.flush()

    await activity_service.log(
        db,
        unverified.user_id,
        "transaction_verified",
        "transaction",
        main_tx.id,
        {"unverified_id": str(unverified.id)},
    )
    return main_tx


async def reject_transaction(
    db: AsyncSession, unverified: UnverifiedTransaction
) -> None:
    await db.delete(unverified)
    await db.flush()
    await activity_service.log(
        db,
        unverified.user_id,
        "transaction_rejected",
        "unverified_transaction",
        unverified.id,
    )
