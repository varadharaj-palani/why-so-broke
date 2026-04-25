"""add jars and jar_contributions tables

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-04-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'jars',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('target_amount', sa.Numeric(12, 2), nullable=True),
        sa.Column('color', sa.String(20), nullable=True),
        sa.Column('is_archived', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('user_id', 'name', name='uq_jar_user_name'),
    )

    op.create_table(
        'jar_contributions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('jar_id', UUID(as_uuid=True), sa.ForeignKey('jars.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('bank_id', UUID(as_uuid=True), sa.ForeignKey('banks.id', ondelete='SET NULL'), nullable=True),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('date', sa.Date, nullable=False),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_jar_contributions_user_jar', 'jar_contributions', ['user_id', 'jar_id'])
    op.create_index('ix_jar_contributions_user_bank', 'jar_contributions', ['user_id', 'bank_id'])


def downgrade() -> None:
    op.drop_index('ix_jar_contributions_user_bank', table_name='jar_contributions')
    op.drop_index('ix_jar_contributions_user_jar', table_name='jar_contributions')
    op.drop_table('jar_contributions')
    op.drop_table('jars')
