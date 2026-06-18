#!/usr/bin/env python3
"""Reassign invoices to target farm + reprocess uploaded ones.

Temporarily drops the composite FK constraints, does the reassignment,
then re-adds them.
"""
import asyncio
import uuid
import asyncpg
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

DSN = "postgresql://postgres:postgres@localhost:5432/farm_copilot_py"
TARGET_FARM_ID = uuid.UUID("92d7d009-47d1-4e63-ba6a-01d06edfb6b8")
OUT = os.path.join(os.path.dirname(__file__), "fix_result.txt")

lines = []
def log(msg):
    lines.append(msg)
    print(msg, flush=True)

async def main():
    conn = await asyncio.wait_for(asyncpg.connect(DSN), timeout=5.0)
    try:
        async with conn.transaction():
            # ── Temporarily drop composite FK constraints ──
            log("=== Dropping composite FK constraints ===")
            await conn.execute("ALTER TABLE invoices DROP CONSTRAINT IF EXISTS fk_invoices_uploaded_document")
            await conn.execute("ALTER TABLE invoices DROP CONSTRAINT IF EXISTS fk_invoices_supplier")
            log("  Done")

            # ── Find invoices to reassign ──
            invoices_to_move = await conn.fetch("""
                SELECT i.id, i.farm_id, i.status, i.uploaded_document_id,
                       i.supplier_id, s.name as sup_name, s.tax_id as sup_tax
                FROM invoices i
                LEFT JOIN suppliers s ON i.supplier_id = s.id
                WHERE i.farm_id != $1
                ORDER BY i.created_at
            """, TARGET_FARM_ID)

            log(f"\n=== REASSIGNMENT: {len(invoices_to_move)} invoices to move ===")

            # ── Ensure supplier exists on target farm ──
            supplier_map = {}
            for inv in invoices_to_move:
                old_sup_id = inv["supplier_id"]
                if old_sup_id is None or old_sup_id in supplier_map:
                    continue
                sup_name = inv["sup_name"]
                sup_tax = inv["sup_tax"]

                existing = await conn.fetchrow(
                    "SELECT id FROM suppliers WHERE farm_id = $1 AND tax_id = $2",
                    TARGET_FARM_ID, sup_tax
                )
                if existing:
                    supplier_map[old_sup_id] = existing["id"]
                    log(f"  Reusing supplier '{sup_name}': {existing['id']}")
                else:
                    new_sup_id = uuid.uuid4()
                    await conn.execute(
                        "INSERT INTO suppliers (id, farm_id, name, tax_id) VALUES ($1, $2, $3, $4)",
                        new_sup_id, TARGET_FARM_ID, sup_name, sup_tax
                    )
                    supplier_map[old_sup_id] = new_sup_id
                    log(f"  Created supplier '{sup_name}': {new_sup_id}")

            # ── Update uploaded_documents + invoices ──
            log("\n=== Moving data ===")
            for inv in invoices_to_move:
                inv_id = inv["id"]
                doc_id = inv["uploaded_document_id"]
                old_sup = inv["supplier_id"]
                new_sup = supplier_map.get(old_sup) if old_sup else None

                await conn.execute(
                    "UPDATE uploaded_documents SET farm_id = $1 WHERE id = $2",
                    TARGET_FARM_ID, doc_id
                )
                await conn.execute(
                    "UPDATE invoices SET farm_id = $1, supplier_id = $2 WHERE id = $3",
                    TARGET_FARM_ID, new_sup, inv_id
                )
                log(f"  inv={inv_id} doc={doc_id} status={inv['status']} -> target farm")

            # ── Reassign related records ──
            log("\n=== Related records ===")
            for table in ["invoice_alerts", "invoice_explanations",
                          "benchmark_observations", "stock_movements",
                          "line_corrections"]:
                try:
                    res = await conn.execute(
                        f"UPDATE {table} SET farm_id = $1 WHERE farm_id != $1",
                        TARGET_FARM_ID
                    )
                    log(f"  {table}: {res}")
                except Exception as e:
                    log(f"  {table}: skip ({e})")

            # ── Re-add composite FK constraints ──
            log("\n=== Re-adding composite FK constraints ===")
            await conn.execute("""
                ALTER TABLE invoices ADD CONSTRAINT fk_invoices_uploaded_document
                FOREIGN KEY (uploaded_document_id, farm_id)
                REFERENCES uploaded_documents (id, farm_id)
            """)
            await conn.execute("""
                ALTER TABLE invoices ADD CONSTRAINT fk_invoices_supplier
                FOREIGN KEY (supplier_id, farm_id)
                REFERENCES suppliers (id, farm_id)
            """)
            log("  Done")

        log("\n=== TRANSACTION COMMITTED ===")

        # ── Verify ──
        log("\n=== VERIFICATION ===")
        final = await conn.fetch("""
            SELECT i.id, i.farm_id, i.status, s.name as supplier_name,
                   i.invoice_number, i.total_amount::text
            FROM invoices i LEFT JOIN suppliers s ON i.supplier_id = s.id
            ORDER BY i.created_at
        """)
        for r in final:
            ok = "✓" if r["farm_id"] == TARGET_FARM_ID else "✗"
            log(f"  {ok} {r['id']}  farm={r['farm_id']}  status={r['status']:15s}  "
                f"sup={str(r['supplier_name']):30s}  inv#={r['invoice_number']}  total={r['total_amount']}")

        all_target = all(r["farm_id"] == TARGET_FARM_ID for r in final)
        log(f"\n  All on target farm: {'YES ✓' if all_target else 'NO ✗'}")

        uploaded = [r for r in final if r["status"] == "uploaded"]
        log(f"\n=== UPLOADED INVOICES NEEDING REPROCESSING: {len(uploaded)} ===")
        for u in uploaded:
            log(f"  {u['id']}")

    finally:
        await conn.close()

    with open(OUT, "w") as f:
        f.write("\n".join(lines) + "\n")

asyncio.run(main())
