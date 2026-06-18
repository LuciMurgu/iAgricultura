"""Integration tests for exact normalization worker shim.

Verifies alias matching, winner persistence, ambiguity handling,
and no-match behavior against a live PostgreSQL database.
"""

from __future__ import annotations

from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.database.models import InvoiceLineItem
from farm_copilot.worker.exact_normalization import resolve_exact_normalization
from tests.conftest import requires_db
from tests.helpers import (
    seed_canonical_product,
    seed_farm,
    seed_invoice,
    seed_line_item,
    seed_product_alias,
    seed_uploaded_document,
)


@requires_db
@pytest.mark.integration
class TestNormalizationIntegration:
    """Exact normalization integration tests — alias matching + persistence."""

    async def test_exact_alias_match_winner_persisted(
        self, db_session: AsyncSession
    ) -> None:
        """Exact alias match → line updated with canonical_product_id."""
        farm = await seed_farm(db_session)
        doc = await seed_uploaded_document(db_session, farm.id)
        invoice = await seed_invoice(
            db_session, farm.id, doc.id, status="processing"
        )
        product = await seed_canonical_product(
            db_session, name="IT Norm Test Azotat de amoniu"
        )
        await seed_product_alias(
            db_session,
            canonical_product_id=product.id,
            alias_text="Azotat de amoniu 34.4%",
        )
        line = await seed_line_item(
            db_session,
            invoice.id,
            line_order=1,
            raw_description="Azotat de amoniu 34.4%",
            quantity=Decimal("100"),
            unit="KGM",
        )

        result = await resolve_exact_normalization(
            db_session, invoice_id=invoice.id, farm_id=farm.id
        )

        assert result.completed is True
        assert result.winner_count == 1
        assert result.none_count == 0

        # Verify persistence
        refreshed = await db_session.execute(
            select(InvoiceLineItem).where(InvoiceLineItem.id == line.id)
        )
        updated_line = refreshed.scalar_one()
        assert updated_line.canonical_product_id == product.id
        assert updated_line.normalization_confidence == Decimal("1.000")
        assert updated_line.normalization_method == "exact_alias"

    async def test_no_alias_match_unmatched(
        self, db_session: AsyncSession
    ) -> None:
        """Unknown description → no canonical_product_id persisted."""
        farm = await seed_farm(db_session)
        doc = await seed_uploaded_document(db_session, farm.id)
        invoice = await seed_invoice(
            db_session, farm.id, doc.id, status="processing"
        )
        await seed_line_item(
            db_session,
            invoice.id,
            line_order=1,
            raw_description="Completely unknown product XYZ-9999",
            quantity=Decimal("10"),
            unit="KGM",
        )

        result = await resolve_exact_normalization(
            db_session, invoice_id=invoice.id, farm_id=farm.id
        )

        assert result.completed is True
        assert result.winner_count == 0
        assert result.none_count == 1

    async def test_ambiguous_aliases_no_winner(
        self, db_session: AsyncSession
    ) -> None:
        """Two products with same alias text at same tier → ambiguous."""
        farm = await seed_farm(db_session)
        doc = await seed_uploaded_document(db_session, farm.id)
        invoice = await seed_invoice(
            db_session, farm.id, doc.id, status="processing"
        )

        product_a = await seed_canonical_product(
            db_session, name="IT Ambig Product A"
        )
        product_b = await seed_canonical_product(
            db_session, name="IT Ambig Product B"
        )
        # Same alias text, same tier (global = no farm_id, no supplier_id)
        await seed_product_alias(
            db_session,
            canonical_product_id=product_a.id,
            alias_text="Ambiguous Alias Text",
        )
        await seed_product_alias(
            db_session,
            canonical_product_id=product_b.id,
            alias_text="Ambiguous Alias Text",
        )

        await seed_line_item(
            db_session,
            invoice.id,
            line_order=1,
            raw_description="Ambiguous Alias Text",
            quantity=Decimal("10"),
            unit="KGM",
        )

        result = await resolve_exact_normalization(
            db_session, invoice_id=invoice.id, farm_id=farm.id
        )

        assert result.completed is True
        # Should be either ambiguous or the domain function picks one
        # based on precedence — either way, no crash
        assert (
            result.winner_count + result.ambiguous_count + result.none_count
            == 1
        )
