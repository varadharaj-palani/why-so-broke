import os
import tempfile
import uuid
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.import_job import ImportJob
from app.schemas.import_job import ImportJobOut
from app.services.import_service import compute_hash, process_import
from app.services import activity_service
from app.config import settings

router = APIRouter(prefix="/imports", tags=["imports"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_statement(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    bank_hint: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

    file_hash = compute_hash(file_bytes)

    # Save to temp file
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp.write(file_bytes)
    tmp.close()

    job = ImportJob(
        user_id=current_user.id,
        filename=file.filename,
        file_hash=file_hash,
        bank_hint=bank_hint,
        llm_provider=settings.LLM_PROVIDER,
        status="processing",
    )
    db.add(job)
    await db.flush()
    await activity_service.log(db, current_user.id, "import_started", "import_job", job.id,
                                {"filename": file.filename, "bank_hint": bank_hint})
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(process_import, str(job.id), str(current_user.id), tmp.name, bank_hint)

    return {"import_job_id": str(job.id), "status": "processing"}


@router.get("", response_model=list[ImportJobOut])
async def list_imports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ImportJob)
        .where(ImportJob.user_id == current_user.id)
        .order_by(ImportJob.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{job_id}", response_model=ImportJobOut)
async def get_import(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ImportJob).where(ImportJob.id == job_id, ImportJob.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Import job not found")
    return job
