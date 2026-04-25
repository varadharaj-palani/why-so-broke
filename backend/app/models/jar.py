import uuid
from datetime import datetime, timezone, date
from decimal import Decimal
from sqlalchemy import String, Date, DateTime, ForeignKey, Text, Numeric, Boolean, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Jar(Base):
    __tablename__ = "jars"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_jar_user_name"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    emoji: Mapped[str | None] = mapped_column(String(10), nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user: Mapped["User"] = relationship("User", back_populates="jars")
    contributions: Mapped[list["JarContribution"]] = relationship("JarContribution", back_populates="jar", cascade="all, delete-orphan")


class JarContribution(Base):
    __tablename__ = "jar_contributions"
    __table_args__ = (
        Index("ix_jar_contributions_user_jar", "user_id", "jar_id"),
        Index("ix_jar_contributions_user_bank", "user_id", "bank_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jar_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jars.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    bank_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("banks.id", ondelete="SET NULL"), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    jar: Mapped["Jar"] = relationship("Jar", back_populates="contributions")
    bank: Mapped["Bank | None"] = relationship("Bank", foreign_keys=[bank_id])
