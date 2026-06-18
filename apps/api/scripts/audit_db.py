#!/usr/bin/env python3
"""Write DB audit to a file to avoid terminal issues."""
import asyncio, asyncpg, sys

DSN = "postgresql://postgres:postgres@localhost:5432/farm_copilot_py"
OUT = "/home/lucian/AgriUnu/farm-copilot-py/scripts/audit_result.txt"

async def main():
    conn = await asyncio.wait_for(asyncpg.connect(DSN), timeout=5.0)
    lines = []
    try:
        lines.append("=== FARMS ===")
        for f in await conn.fetch("SELECT id, name, cif FROM farms ORDER BY created_at"):
            lines.append(f'  {f["id"]}  name={f["name"]}  cif={f["cif"]}')

        lines.append("\n=== INVOICES ===")
        for r in await conn.fetch("""
            SELECT i.id, i.farm_id, i.status, s.name as supplier_name,
                   i.invoice_number, i.total_amount::text,
                   i.uploaded_document_id, i.supplier_id
            FROM invoices i LEFT JOIN suppliers s ON i.supplier_id = s.id
            ORDER BY i.created_at
        """):
            lines.append(f'  {r["id"]}  farm={r["farm_id"]}  '
                  f'status={r["status"]:15s}  sup={str(r["supplier_name"]):30s}  '
                  f'inv#={r["invoice_number"]}  total={r["total_amount"]}  '
                  f'doc={r["uploaded_document_id"]}  sup_id={r["supplier_id"]}')

        lines.append("\n=== SUPPLIERS ===")
        for s in await conn.fetch("SELECT id, farm_id, name, tax_id FROM suppliers ORDER BY farm_id"):
            lines.append(f'  {s["id"]}  farm={s["farm_id"]}  name={s["name"]}  tax={s["tax_id"]}')

        lines.append("\n=== UPLOADED DOCS ===")
        for d in await conn.fetch("SELECT id, farm_id, source_type, original_filename FROM uploaded_documents ORDER BY farm_id"):
            lines.append(f'  {d["id"]}  farm={d["farm_id"]}  type={d["source_type"]}  file={d["original_filename"]}')

        lines.append("\n=== LINE ITEMS PER INVOICE ===")
        for l in await conn.fetch("SELECT invoice_id, count(*) as cnt FROM invoice_line_items GROUP BY invoice_id"):
            lines.append(f'  inv={l["invoice_id"]}  lines={l["cnt"]}')

        lines.append("\n=== ALERTS PER INVOICE ===")
        for a in await conn.fetch("SELECT invoice_id, count(*) as cnt FROM invoice_alerts GROUP BY invoice_id"):
            lines.append(f'  inv={a["invoice_id"]}  alerts={a["cnt"]}')

        lines.append("\n=== STOCK MOVEMENTS ===")
        cnt = await conn.fetchval("SELECT count(*) FROM stock_movements")
        lines.append(f'  total: {cnt}')

    finally:
        await conn.close()

    with open(OUT, "w") as f:
        f.write("\n".join(lines) + "\n")
    sys.stdout.write("DONE\n")
    sys.stdout.flush()

asyncio.run(main())
