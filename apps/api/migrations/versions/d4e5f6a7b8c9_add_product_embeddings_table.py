"""add product_embeddings table with pgvector

Revision ID: d4e5f6a7b8c9
Revises: 1eb8b0707945
Create Date: 2026-04-05 01:20:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "1eb8b0707945"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "product_embeddings",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("canonical_product_id", sa.UUID(), nullable=False),
        sa.Column("embedding", Vector(384), nullable=False),
        sa.Column(
            "model_name",
            sa.String(),
            nullable=False,
            server_default="all-MiniLM-L6-v2",
        ),
        sa.Column("text_source", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["canonical_product_id"],
            ["canonical_products.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "canonical_product_id",
            name="uq_product_embeddings_product",
        ),
    )


def downgrade() -> None:
    op.drop_table("product_embeddings")
    # Note: we do NOT drop the vector extension in downgrade
    # because other tables might use it in the future.
