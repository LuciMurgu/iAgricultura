"""add transport_declarations, transport_declaration_items, nc_code column

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-04-05 02:10:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add nc_code column to canonical_products
    op.add_column(
        "canonical_products",
        sa.Column("nc_code", sa.String(8), nullable=True),
    )

    # Create transport_declarations table
    op.create_table(
        "transport_declarations",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("farm_id", sa.UUID(), nullable=False),
        sa.Column("reference", sa.String(100), nullable=False),
        sa.Column(
            "declaration_type",
            sa.String(20),
            nullable=False,
            server_default="notification",
        ),
        sa.Column(
            "operation_type",
            sa.Integer(),
            nullable=False,
            server_default="10",
        ),
        sa.Column(
            "operation_scope",
            sa.Integer(),
            nullable=False,
            server_default="101",
        ),
        sa.Column("departure_date", sa.Date(), nullable=False),
        sa.Column("sender_cif", sa.String(20), nullable=False),
        sa.Column("sender_name", sa.String(200), nullable=False),
        sa.Column(
            "sender_country",
            sa.String(2),
            nullable=False,
            server_default="RO",
        ),
        sa.Column("receiver_cif", sa.String(20), nullable=False),
        sa.Column("receiver_name", sa.String(200), nullable=False),
        sa.Column(
            "receiver_country",
            sa.String(2),
            nullable=False,
            server_default="RO",
        ),
        sa.Column(
            "load_country",
            sa.String(2),
            nullable=False,
            server_default="RO",
        ),
        sa.Column("load_county", sa.String(2), nullable=True),
        sa.Column("load_city", sa.String(100), nullable=False),
        sa.Column("load_street", sa.String(200), nullable=True),
        sa.Column("load_postal_code", sa.String(10), nullable=True),
        sa.Column(
            "unload_country",
            sa.String(2),
            nullable=False,
            server_default="RO",
        ),
        sa.Column("unload_county", sa.String(2), nullable=True),
        sa.Column("unload_city", sa.String(100), nullable=False),
        sa.Column("unload_street", sa.String(200), nullable=True),
        sa.Column("unload_postal_code", sa.String(10), nullable=True),
        sa.Column("vehicle_plate", sa.String(20), nullable=True),
        sa.Column("carrier_cif", sa.String(20), nullable=True),
        sa.Column("carrier_name", sa.String(200), nullable=True),
        sa.Column(
            "carrier_country",
            sa.String(2),
            nullable=False,
            server_default="RO",
        ),
        sa.Column("upload_index", sa.String(100), nullable=True),
        sa.Column("uit_code", sa.String(36), nullable=True),
        sa.Column("uit_valid_from", sa.Date(), nullable=True),
        sa.Column("uit_valid_until", sa.Date(), nullable=True),
        sa.Column(
            "anaf_status",
            sa.String(20),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("anaf_errors", sa.Text(), nullable=True),
        sa.Column("raw_xml", sa.Text(), nullable=True),
        sa.Column("invoice_id", sa.UUID(), nullable=True),
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
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"]),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_transport_declarations_farm_id",
        "transport_declarations",
        ["farm_id"],
    )
    op.create_index(
        "ix_transport_declarations_anaf_status",
        "transport_declarations",
        ["anaf_status"],
    )

    # Create transport_declaration_items table
    op.create_table(
        "transport_declaration_items",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("declaration_id", sa.UUID(), nullable=False),
        sa.Column("line_order", sa.Integer(), nullable=False),
        sa.Column("nc_tariff_code", sa.String(8), nullable=False),
        sa.Column("product_description", sa.String(500), nullable=False),
        sa.Column("canonical_product_id", sa.UUID(), nullable=True),
        sa.Column("quantity", sa.Numeric(15, 4), nullable=False),
        sa.Column("unit", sa.String(10), nullable=False),
        sa.Column("net_weight_kg", sa.Numeric(15, 2), nullable=False),
        sa.Column("gross_weight_kg", sa.Numeric(15, 2), nullable=False),
        sa.Column("value_ron", sa.Numeric(15, 2), nullable=False),
        sa.Column(
            "operation_scope",
            sa.Integer(),
            nullable=False,
            server_default="101",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["declaration_id"],
            ["transport_declarations.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["canonical_product_id"],
            ["canonical_products.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "declaration_id",
            "line_order",
            name="uq_transport_items_decl_line",
        ),
    )


def downgrade() -> None:
    op.drop_table("transport_declaration_items")
    op.drop_index(
        "ix_transport_declarations_anaf_status",
        table_name="transport_declarations",
    )
    op.drop_index(
        "ix_transport_declarations_farm_id",
        table_name="transport_declarations",
    )
    op.drop_table("transport_declarations")
    op.drop_column("canonical_products", "nc_code")
