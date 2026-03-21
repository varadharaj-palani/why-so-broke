"""budget cycle dates (start_date, end_date)

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("budgets", sa.Column("start_date", sa.Date(), nullable=True))
    op.add_column("budgets", sa.Column("end_date", sa.Date(), nullable=True))
    # Backfill: derive start/end from the existing month column
    op.execute(
        "UPDATE budgets SET start_date = month, "
        "end_date = (month + INTERVAL '1 month' - INTERVAL '1 day')::date "
        "WHERE start_date IS NULL"
    )
    # Make month nullable for new rows created without it
    op.alter_column("budgets", "month", nullable=True)
    # Replace the unique constraint to key on start_date
    op.drop_constraint("uq_budget_user_category_month", "budgets", type_="unique")
    op.create_unique_constraint(
        "uq_budget_user_category_start", "budgets", ["user_id", "category", "start_date"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_budget_user_category_start", "budgets", type_="unique")
    op.create_unique_constraint(
        "uq_budget_user_category_month", "budgets", ["user_id", "category", "month"]
    )
    op.alter_column("budgets", "month", nullable=False)
    op.drop_column("budgets", "end_date")
    op.drop_column("budgets", "start_date")
