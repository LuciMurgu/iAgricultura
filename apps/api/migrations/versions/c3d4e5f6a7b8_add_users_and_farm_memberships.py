"""add users and farm_memberships tables

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-04 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create farm_membership_role enum type
    farm_membership_role = postgresql.ENUM(
        'owner', 'member', 'viewer',
        name='farm_membership_role',
        create_type=True,
    )

    # users table
    op.create_table('users',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email', name='uq_users_email'),
    )

    # farm_memberships table
    op.create_table('farm_memberships',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('farm_id', sa.UUID(), nullable=False),
        sa.Column('role', farm_membership_role, nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['farm_id'], ['farms.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'farm_id', name='uq_farm_memberships_user_farm'),
    )
    op.create_index('ix_farm_memberships_user_id', 'farm_memberships', ['user_id'], unique=False)
    op.create_index('ix_farm_memberships_farm_id', 'farm_memberships', ['farm_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_farm_memberships_farm_id', table_name='farm_memberships')
    op.drop_index('ix_farm_memberships_user_id', table_name='farm_memberships')
    op.drop_table('farm_memberships')
    op.drop_table('users')

    # Drop the enum type
    sa.Enum(name='farm_membership_role').drop(op.get_bind(), checkfirst=True)
