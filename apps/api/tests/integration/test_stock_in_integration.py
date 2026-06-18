"""Integration tests for stock-in worker shim.

Verifies movement creation, idempotency, validation gating,
and skip logic against a live PostgreSQL database.
"""

from __future__ import annotations

from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.database.stock_movements import list_stock_movements_by_invoice_id
from farm_copilot.worker.stock_in import resolve_stock_in
from tests.conftest import requires_db
from tests.helpers import (
    seed_canonical_product,
    seed_farm,
    seed_invoice,
    seed_line_item,
    seed_uploaded_document,
)


@requires_db
@pytest.mark.integration
class TestStockInIntegration:
    """Stock-in integration tests — movements, idempotency, gating."""

    async def test_first_run_creates_movements(
        self, db_session: AsyncSession
    ) -> None:
        """First run creates stock movements for eligible lines."""
        farm = await seed_farm(db_session)
        doc = await seed_uploaded_document(db_session, farm.id)
        invoice = await seed_invoice(
            db_session, farm.id, doc.id, status="processing"
        )

        product_a = await seed_canonical_product(
            db_session, name="IT Stock Test Product A"
        )
        product_b = await seed_canonical_product(
            db_session, name="IT Stock Test Product B"
        )

        await seed_line_item(
            db_session,
            invoice.id,
            line_order=1,
            raw_description="Product A",
            line_classification="stockable_input",
            canonical_product_id=product_a.id,
            quantity=Decimal("100"),
            unit="KGM",
            unit_price=Decimal("2.50"),
            line_total=Decimal("250.00"),
        )
        await seed_line_item(
            db_session,
            invoice.id,
            line_order=2,
            raw_description="Product B",
            line_classification="stockable_input",
            canonical_product_id=product_b.id,
            quantity=Decimal("50"),
            unit="LTR",
            unit_price=Decimal("10.00"),
            line_total=Decimal("500.00"),
        )

        result = await resolve_stock_in(
            db_session,
            invoice_id=invoice.id,
            farm_id=farm.id,
            has_blocking_findings=False,
        )

        assert result.completed is True
        assert result.created_count == 2
        assert result.already_present_count == 0

        movements = await list_stock_movements_by_invoice_id(
            db_session, farm_id=farm.id, invoice_id=invoice.id
        )
        assert len(movements) == 2

        qtys = sorted(m.quantity for m in movements)
        assert qtys == [Decimal("50"), Decimal("100")]

    async def test_idempotent_rerun(self, db_session: AsyncSession) -> None:
        """Second run returns already_present, no duplicates."""
        farm = await seed_farm(db_session)
        doc = await seed_uploaded_document(db_session, farm.id)
        invoice = await seed_invoice(
            db_session, farm.id, doc.id, status="processing"
        )
        product = await seed_canonical_product(
            db_session, name="IT Idempotent Test Product"
        )
        await seed_line_item(
            db_session,
            invoice.id,
            line_order=1,
            raw_description="Idempotent line",
            line_classification="stockable_input",
            canonical_product_id=product.id,
            quantity=Decimal("10"),
            unit="KGM",
        )

        # First run
        first = await resolve_stock_in(
            db_session,
            invoice_id=invoice.id,
            farm_id=farm.id,
            has_blocking_findings=False,
        )
        assert first.created_count == 1

        # Second run — idempotent
        second = await resolve_stock_in(
            db_session,
            invoice_id=invoice.id,
            farm_id=farm.id,
            has_blocking_findings=False,
        )
        assert second.created_count == 0
        assert second.already_present_count == 1

        # Only 1 movement in DB
        movements = await list_stock_movements_by_invoice_id(
            db_session, farm_id=farm.id, invoice_id=invoice.id
        )
        assert len(movements) == 1

    async def test_blocked_by_validation_gate(
        self, db_session: AsyncSession
    ) -> None:
        """Blocking findings → 0 movements, all skipped."""
        farm = await seed_farm(db_session)
        doc = await seed_uploaded_document(db_session, farm.id)
        invoice = await seed_invoice(
            db_session, farm.id, doc.id, status="processing"
        )
        product = await seed_canonical_product(
            db_session, name="IT Blocked Test Product"
        )
        await seed_line_item(
            db_session,
            invoice.id,
            line_order=1,
            raw_description="Blocked line",
            line_classification="stockable_input",
            canonical_product_id=product.id,
            quantity=Decimal("10"),
            unit="KGM",
        )

        result = await resolve_stock_in(
            db_session,
            invoice_id=invoice.id,
            farm_id=farm.id,
            has_blocking_findings=True,
        )

        assert result.completed is True
        assert result.created_count == 0
        assert result.derivation is not None
        assert result.derivation.blocked_by_validation is True

    async def test_non_stockable_lines_skipped(
        self, db_session: AsyncSession
    ) -> None:
        """Service lines are skipped."""
        farm = await seed_farm(db_session)
        doc = await seed_uploaded_document(db_session, farm.id)
        invoice = await seed_invoice(
            db_session, farm.id, doc.id, status="processing"
        )
        product = await seed_canonical_product(
            db_session, name="IT Service Test Product"
        )
        await seed_line_item(
            db_session,
            invoice.id,
            line_order=1,
            raw_description="Transport service",
            line_classification="service",
            canonical_product_id=product.id,
            quantity=Decimal("1"),
            unit="EA",
        )

        result = await resolve_stock_in(
            db_session,
            invoice_id=invoice.id,
            farm_id=farm.id,
            has_blocking_findings=False,
        )

        assert result.completed is True
        assert result.created_count == 0
        assert result.skipped_count >= 1

    async def test_missing_canonical_product_skipped(
        self, db_session: AsyncSession
    ) -> None:
        """Stockable line without canonical_product_id is skipped."""
        farm = await seed_farm(db_session)
        doc = await seed_uploaded_document(db_session, farm.id)
        invoice = await seed_invoice(
            db_session, farm.id, doc.id, status="processing"
        )
        await seed_line_item(
            db_session,
            invoice.id,
            line_order=1,
            raw_description="Unknown product",
            line_classification="stockable_input",
            canonical_product_id=None,
            quantity=Decimal("10"),
            unit="KGM",
        )

        result = await resolve_stock_in(
            db_session,
            invoice_id=invoice.id,
            farm_id=farm.id,
            has_blocking_findings=False,
        )

        assert result.completed is True
        assert result.created_count == 0
        assert result.skipped_count >= 1
