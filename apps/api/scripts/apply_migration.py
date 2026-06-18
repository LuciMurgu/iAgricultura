#!/usr/bin/env python3
"""Apply missing e-Transport schema + stamp alembic to head."""
import asyncio
import asyncpg

DSN = "postgresql://postgres:postgres@localhost:5432/farm_copilot_py"

SQLS = [
    # nc_code column
    "ALTER TABLE canonical_products ADD COLUMN IF NOT EXISTS nc_code VARCHAR(8)",

    # transport_declarations
    """CREATE TABLE IF NOT EXISTS transport_declarations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        farm_id UUID NOT NULL REFERENCES farms(id),
        reference VARCHAR(100) NOT NULL,
        declaration_type VARCHAR(20) NOT NULL DEFAULT 'notification',
        operation_type INTEGER NOT NULL DEFAULT 10,
        operation_scope INTEGER NOT NULL DEFAULT 101,
        departure_date DATE NOT NULL,
        sender_cif VARCHAR(20) NOT NULL,
        sender_name VARCHAR(200) NOT NULL,
        sender_country VARCHAR(2) NOT NULL DEFAULT 'RO',
        receiver_cif VARCHAR(20) NOT NULL,
        receiver_name VARCHAR(200) NOT NULL,
        receiver_country VARCHAR(2) NOT NULL DEFAULT 'RO',
        load_country VARCHAR(2) NOT NULL DEFAULT 'RO',
        load_county VARCHAR(2),
        load_city VARCHAR(100) NOT NULL,
        load_street VARCHAR(200),
        load_postal_code VARCHAR(10),
        unload_country VARCHAR(2) NOT NULL DEFAULT 'RO',
        unload_county VARCHAR(2),
        unload_city VARCHAR(100) NOT NULL,
        unload_street VARCHAR(200),
        unload_postal_code VARCHAR(10),
        vehicle_plate VARCHAR(20),
        carrier_cif VARCHAR(20),
        carrier_name VARCHAR(200),
        carrier_country VARCHAR(2) NOT NULL DEFAULT 'RO',
        upload_index VARCHAR(100),
        uit_code VARCHAR(36),
        uit_valid_from DATE,
        uit_valid_until DATE,
        anaf_status VARCHAR(20) NOT NULL DEFAULT 'draft',
        anaf_errors TEXT,
        raw_xml TEXT,
        invoice_id UUID REFERENCES invoices(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )""",
    "CREATE INDEX IF NOT EXISTS ix_transport_declarations_farm_id ON transport_declarations(farm_id)",
    "CREATE INDEX IF NOT EXISTS ix_transport_declarations_anaf_status ON transport_declarations(anaf_status)",

    # transport_declaration_items
    """CREATE TABLE IF NOT EXISTS transport_declaration_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        declaration_id UUID NOT NULL REFERENCES transport_declarations(id) ON DELETE CASCADE,
        line_order INTEGER NOT NULL,
        nc_tariff_code VARCHAR(8) NOT NULL,
        product_description VARCHAR(500) NOT NULL,
        canonical_product_id UUID REFERENCES canonical_products(id),
        quantity NUMERIC(15,4) NOT NULL,
        unit VARCHAR(10) NOT NULL,
        net_weight_kg NUMERIC(15,2) NOT NULL,
        gross_weight_kg NUMERIC(15,2) NOT NULL,
        value_ron NUMERIC(15,2) NOT NULL,
        operation_scope INTEGER NOT NULL DEFAULT 101,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(declaration_id, line_order)
    )""",

    # Stamp alembic to head
    "CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL)",
    "DELETE FROM alembic_version",
    "INSERT INTO alembic_version (version_num) VALUES ('e5f6a7b8c9d0')",
]

async def main():
    conn = await asyncio.wait_for(asyncpg.connect(DSN), timeout=5.0)
    try:
        for sql in SQLS:
            await conn.execute(sql)
            first_line = sql.strip().split('\n')[0][:60]
            print(f"  OK: {first_line}...", flush=True)
        print("\nAll schema updates applied. Alembic stamped to e5f6a7b8c9d0.", flush=True)
    finally:
        await conn.close()

asyncio.run(main())
