"""add anaf_sync_log table

Revision ID: a1b2c3d4e5f6
Revises: fd3136f80cc4
Create Date: 2026-04-04 21:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'fd3136f80cc4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('anaf_sync_log',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('farm_id', sa.UUID(), nullable=False),
    sa.Column('sync_type', sa.String(), nullable=False),
    sa.Column('anaf_message_id', sa.String(), nullable=True),
    sa.Column('anaf_id_descarcare', sa.String(), nullable=True),
    sa.Column('invoice_id', sa.UUID(), nullable=True),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('error_details', sa.Text(), nullable=True),
    sa.Column('raw_response_hash', sa.String(), nullable=True),
    sa.Column('started_at', postgresql.TIMESTAMP(timezone=True), nullable=False),
    sa.Column('completed_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['farm_id'], ['farms.id'], ),
    sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('farm_id', 'anaf_id_descarcare', name='uq_anaf_sync_log_farm_descarcare')
    )
    op.create_index('ix_anaf_sync_log_farm_id', 'anaf_sync_log', ['farm_id'], unique=False)
    op.create_index('ix_anaf_sync_log_started_at', 'anaf_sync_log', ['started_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_anaf_sync_log_started_at', table_name='anaf_sync_log')
    op.drop_index('ix_anaf_sync_log_farm_id', table_name='anaf_sync_log')
    op.drop_table('anaf_sync_log')
