"""add anaf_tokens table

Revision ID: fd3136f80cc4
Revises: f6c1486c14e1
Create Date: 2026-04-04 21:01:41.296931

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'fd3136f80cc4'
down_revision: Union[str, Sequence[str], None] = 'f6c1486c14e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('anaf_tokens',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('farm_id', sa.UUID(), nullable=False),
    sa.Column('cif', sa.String(), nullable=False),
    sa.Column('client_id', sa.String(), nullable=False),
    sa.Column('client_secret_encrypted', sa.Text(), nullable=False),
    sa.Column('access_token_encrypted', sa.Text(), nullable=False),
    sa.Column('refresh_token_encrypted', sa.Text(), nullable=False),
    sa.Column('family_param', sa.String(), nullable=True),
    sa.Column('access_token_expires_at', postgresql.TIMESTAMP(timezone=True), nullable=False),
    sa.Column('refresh_token_expires_at', postgresql.TIMESTAMP(timezone=True), nullable=False),
    sa.Column('last_refreshed_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['farm_id'], ['farms.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('farm_id', name='uq_anaf_tokens_farm_id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('anaf_tokens')

