"""add invoice_alerts and invoice_explanations tables

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-04 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # invoice_alerts
    op.create_table('invoice_alerts',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('farm_id', sa.UUID(), nullable=False),
    sa.Column('invoice_id', sa.UUID(), nullable=False),
    sa.Column('alert_key', sa.String(), nullable=False),
    sa.Column('severity', sa.String(), nullable=False),
    sa.Column('subject_type', sa.String(), nullable=False),
    sa.Column('subject_id', sa.String(), nullable=False),
    sa.Column('reason_codes', postgresql.JSON(astext_type=sa.Text()), nullable=False),
    sa.Column('evidence', postgresql.JSON(astext_type=sa.Text()), nullable=False),
    sa.Column('confidence', sa.String(), nullable=False),
    sa.Column('recommended_action', sa.String(), nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['farm_id'], ['farms.id'], ),
    sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ),
    sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_invoice_alerts_farm_id', 'invoice_alerts', ['farm_id'], unique=False)
    op.create_index('ix_invoice_alerts_invoice_id', 'invoice_alerts', ['invoice_id'], unique=False)
    op.create_index('ix_invoice_alerts_alert_key', 'invoice_alerts', ['alert_key'], unique=False)

    # invoice_explanations
    op.create_table('invoice_explanations',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('farm_id', sa.UUID(), nullable=False),
    sa.Column('invoice_id', sa.UUID(), nullable=False),
    sa.Column('alert_id', sa.UUID(), nullable=False),
    sa.Column('explanation_kind', sa.String(), nullable=False),
    sa.Column('subject_type', sa.String(), nullable=False),
    sa.Column('subject_id', sa.String(), nullable=False),
    sa.Column('line_order', sa.Integer(), nullable=True),
    sa.Column('what_happened', sa.Text(), nullable=False),
    sa.Column('data_used', postgresql.JSON(astext_type=sa.Text()), nullable=False),
    sa.Column('why_it_matters', sa.Text(), nullable=False),
    sa.Column('support_strength', sa.String(), nullable=False),
    sa.Column('next_action', sa.String(), nullable=False),
    sa.Column('source_references', postgresql.JSON(astext_type=sa.Text()), nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['alert_id'], ['invoice_alerts.id'], ),
    sa.ForeignKeyConstraint(['farm_id'], ['farms.id'], ),
    sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ),
    sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_invoice_explanations_farm_id', 'invoice_explanations', ['farm_id'], unique=False)
    op.create_index('ix_invoice_explanations_invoice_id', 'invoice_explanations', ['invoice_id'], unique=False)
    op.create_index('ix_invoice_explanations_alert_id', 'invoice_explanations', ['alert_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_invoice_explanations_alert_id', table_name='invoice_explanations')
    op.drop_index('ix_invoice_explanations_invoice_id', table_name='invoice_explanations')
    op.drop_index('ix_invoice_explanations_farm_id', table_name='invoice_explanations')
    op.drop_table('invoice_explanations')

    op.drop_index('ix_invoice_alerts_alert_key', table_name='invoice_alerts')
    op.drop_index('ix_invoice_alerts_invoice_id', table_name='invoice_alerts')
    op.drop_index('ix_invoice_alerts_farm_id', table_name='invoice_alerts')
    op.drop_table('invoice_alerts')
