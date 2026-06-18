#!/usr/bin/env python3
"""Final summary report — written to file."""
import asyncio, asyncpg, os

DSN = "postgresql://postgres:postgres@localhost:5432/farm_copilot_py"
OUT = os.path.join(os.path.dirname(__file__), "final_report.txt")

async def main():
    conn = await asyncio.wait_for(asyncpg.connect(DSN), timeout=5.0)
    lines = []
    try:
        lines.append("=" * 70)
        lines.append("FARM COPILOT — INVOICE FIX REPORT")
        lines.append("=" * 70)

        # All invoices
        invs = await conn.fetch("""
            SELECT i.id, i.farm_id, i.status, s.name as supplier_name,
                   i.invoice_number, i.total_amount::text,
                   (SELECT count(*) FROM invoice_line_items li WHERE li.invoice_id = i.id) as line_count,
                   (SELECT count(*) FROM invoice_alerts a WHERE a.invoice_id = i.id) as alert_count
            FROM invoices i LEFT JOIN suppliers s ON i.supplier_id = s.id
            ORDER BY i.created_at
        """)

        target = "92d7d009-47d1-4e63-ba6a-01d06edfb6b8"
        lines.append(f"\nTarget farm: {target}")
        lines.append(f"Total invoices: {len(invs)}")
        lines.append(f"All on target farm: {all(str(r['farm_id']) == target for r in invs)}")
        lines.append("")

        lines.append(f"{'ID':>38s}  {'Status':>15s}  {'Supplier':>30s}  {'Inv#':>18s}  {'Total':>12s}  {'Lines':>5s}  {'Alerts':>6s}")
        lines.append("-" * 135)
        for r in invs:
            lines.append(f"{str(r['id']):>38s}  {r['status']:>15s}  {str(r['supplier_name']):>30s}  "
                         f"{str(r['invoice_number']):>18s}  {str(r['total_amount']):>12s}  "
                         f"{r['line_count']:>5d}  {r['alert_count']:>6d}")

        # Summary
        status_counts = {}
        for r in invs:
            s = r['status']
            status_counts[s] = status_counts.get(s, 0) + 1
        lines.append(f"\nStatus breakdown: {status_counts}")

        # User info
        user = await conn.fetchrow("SELECT email, name FROM users WHERE email = 'lucian@agrounu.ro'")
        lines.append(f"\nAuthenticated user: {user['email']} ({user['name']})")

        mem = await conn.fetchrow("""
            SELECT f.name, fm.farm_id, fm.role FROM farm_memberships fm
            JOIN farms f ON fm.farm_id = f.id
            JOIN users u ON fm.user_id = u.id
            WHERE u.email = 'lucian@agrounu.ro'
        """)
        lines.append(f"Farm: {mem['name']} ({mem['farm_id']}) role={mem['role']}")

        lines.append("\n" + "=" * 70)
        lines.append("WHAT WAS DONE:")
        lines.append("=" * 70)
        lines.append("""
1. AUDIT: Listed all 5 invoices — 3 on wrong farms, 2 stuck as 'uploaded'

2. REASSIGNMENT: Moved 3 invoices to target farm 92d7d009...
   - Dropped composite FKs, reassigned uploaded_documents + invoices + supplier
   - Created supplier 'SC Agro Distribuție SRL' on target farm
   - Reassigned 1 alert + 1 explanation
   - Re-added composite FK constraints (all in one transaction)

3. SCHEMA FIX: Applied missing e-Transport migration (Prompt 32)
   - Added canonical_products.nc_code column
   - Created transport_declarations + transport_declaration_items tables
   - Stamped alembic to e5f6a7b8c9d0

4. REPROCESSING: Ran pipeline on 2 'uploaded' invoices
   - Both completed: uploaded → needs_review
   - Extracted: supplier=SC Agro Distribuție SRL, inv#=FCT-2026-001234, total=15470.00
   - Each has 2 line items

5. RESULT: All 5 invoices on target farm with supplier names, totals, line items
   - 2 completed, 3 needs_review
""")
    finally:
        await conn.close()

    with open(OUT, "w") as f:
        f.write("\n".join(lines))
    print("Report written to", OUT, flush=True)

asyncio.run(main())
