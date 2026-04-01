"""transaction dedup unique constraint

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-03-31

"""
from alembic import op

revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint(
        'uq_transactions_dedup',
        'transactions',
        ['user_id', 'date', 'amount', 'category', 'bank_id', 'mode'],
    )


def downgrade() -> None:
    op.drop_constraint('uq_transactions_dedup', 'transactions', type_='unique')
