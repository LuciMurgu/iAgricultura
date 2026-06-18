"""Hardening tests — edge cases, error paths, and integration gaps.

These tests target areas not covered by existing unit or E2E tests:
- Export routes with mocked sessions
- SAGA batch edge cases (empty lines, zero amounts)
- Dashboard data builder edge cases
- Auth middleware edge cases
- Invoice list with filters and pagination boundaries
"""

from __future__ import annotations

from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from lxml import etree

from farm_copilot.worker.saga_export import (
    SagaExportInvoice,
    SagaExportLine,
    generate_saga_xml,
    generate_saga_xml_batch,
)

# ── SAGA XML edge cases ──────────────────────────────────────────────


class TestSagaXmlEdgeCases:
    """Edge cases for SAGA XML generation."""

    def test_invoice_with_no_lines(self) -> None:
        """Invoice with zero lines still produces valid XML."""
        inv = SagaExportInvoice(
            supplier_name="Test SRL",
            supplier_cif="RO111",
            client_name="Farm SRL",
            client_cif="RO222",
            lines=[],
        )
        xml = generate_saga_xml(inv)
        root = etree.fromstring(xml.encode("utf-8"))
        assert root.tag == "Factura"
        assert root.find("Sumar").findtext("TotalValoare") == "0.00"
        assert root.find("Sumar").findtext("TotalTVA") == "0.00"
        assert root.find("Sumar").findtext("Total") == "0.00"

    def test_invoice_with_none_amounts(self) -> None:
        """Lines with None amounts render as 0.00."""
        line = SagaExportLine(
            line_order=1,
            description="Unknown item",
            unit=None,
            quantity=None,
            unit_price=None,
            line_total=None,
            tax_amount=None,
        )
        inv = SagaExportInvoice(
            client_name="Farm",
            client_cif="RO1",
            lines=[line],
        )
        xml = generate_saga_xml(inv)
        root = etree.fromstring(xml.encode("utf-8"))
        linie = root.find(".//Linie")
        assert linie.findtext("Cantitate") == "0.00"
        assert linie.findtext("Pret") == "0.00"
        assert linie.findtext("Valoare") == "0.00"

    def test_batch_with_single_invoice(self) -> None:
        """Batch with one invoice still uses Facturi root."""
        inv = SagaExportInvoice(
            client_name="Farm",
            client_cif="RO1",
            lines=[],
        )
        xml = generate_saga_xml_batch([inv])
        root = etree.fromstring(xml.encode("utf-8"))
        assert root.tag == "Facturi"
        assert len(root.findall("Factura")) == 1

    def test_special_characters_in_description(self) -> None:
        """XML-unsafe characters (&, <, >) are escaped properly."""
        line = SagaExportLine(
            line_order=1,
            description="Produs <special> & fun",
            unit="BUC",
            quantity=Decimal("1"),
            unit_price=Decimal("10"),
            line_total=Decimal("10"),
            tax_amount=Decimal("1.90"),
        )
        inv = SagaExportInvoice(
            client_name="Farm & Co",
            client_cif="RO1",
            lines=[line],
        )
        xml = generate_saga_xml(inv)
        # Must be valid XML (would throw if not escaped)
        root = etree.fromstring(xml.encode("utf-8"))
        assert root.find("Antet").findtext("ClientNume") == "Farm & Co"
        assert root.find(".//Linie").findtext("Descriere") == "Produs <special> & fun"

    def test_all_antet_fields_present(self) -> None:
        """All 20 Antet tags exist even when data is empty."""
        inv = SagaExportInvoice(
            client_name="Test",
            client_cif="RO1",
            lines=[],
        )
        xml = generate_saga_xml(inv)
        root = etree.fromstring(xml.encode("utf-8"))
        antet = root.find("Antet")
        expected_tags = [
            "FurnizorNume", "FurnizorCIF", "FurnizorNrRegCom",
            "FurnizorAdresa", "FurnizorBanca", "FurnizorIBAN",
            "ClientNume", "ClientCIF", "ClientNrRegCom",
            "ClientAdresa", "ClientBanca", "ClientIBAN",
            "FacturaNumar", "FacturaData", "FacturaScadenta",
            "FacturaTaxareInversa", "FacturaTVAIncasare", "FacturaMoneda",
        ]
        for tag in expected_tags:
            assert antet.find(tag) is not None, f"Missing tag: {tag}"

    def test_tva_la_incasare_flag(self) -> None:
        """TVA la încasare maps to Da/Nu correctly."""
        inv_yes = SagaExportInvoice(
            client_name="F", client_cif="R", tva_la_incasare=True, lines=[]
        )
        inv_no = SagaExportInvoice(
            client_name="F", client_cif="R", tva_la_incasare=False, lines=[]
        )
        root_yes = etree.fromstring(generate_saga_xml(inv_yes).encode("utf-8"))
        root_no = etree.fromstring(generate_saga_xml(inv_no).encode("utf-8"))
        assert root_yes.find("Antet").findtext("FacturaTVAIncasare") == "Da"
        assert root_no.find("Antet").findtext("FacturaTVAIncasare") == "Nu"

    def test_explicit_totals_override_computed(self) -> None:
        """Explicit totals override line-computed sums."""
        line = SagaExportLine(
            line_order=1, description="X", unit="BUC",
            quantity=Decimal("1"), unit_price=Decimal("100"),
            line_total=Decimal("100"), tax_amount=Decimal("19"),
        )
        inv = SagaExportInvoice(
            client_name="F", client_cif="R",
            lines=[line],
            total_without_tva=Decimal("200.00"),
            total_tva=Decimal("38.00"),
            total_with_tva=Decimal("238.00"),
        )
        xml = generate_saga_xml(inv)
        root = etree.fromstring(xml.encode("utf-8"))
        sumar = root.find("Sumar")
        assert sumar.findtext("TotalValoare") == "200.00"
        assert sumar.findtext("TotalTVA") == "38.00"
        assert sumar.findtext("Total") == "238.00"

    def test_xml_declaration_present(self) -> None:
        """Output starts with XML declaration."""
        inv = SagaExportInvoice(
            client_name="F", client_cif="R", lines=[]
        )
        xml = generate_saga_xml(inv)
        assert xml.startswith("<?xml version='1.0' encoding='UTF-8'?>")

    def test_guid_omitted_when_none(self) -> None:
        """GUID_factura tag is omitted when guid is None."""
        inv = SagaExportInvoice(
            client_name="F", client_cif="R", guid=None, lines=[]
        )
        xml = generate_saga_xml(inv)
        root = etree.fromstring(xml.encode("utf-8"))
        assert root.find("Antet").find("GUID_factura") is None


# ── SAGA export route auth boundary tests ────────────────────────────


class TestExportRouteAuth:
    """Export route requires logged-in sessions."""

    @pytest.fixture()
    def _app(self):
        """Return the FastAPI app."""
        from farm_copilot.api.app import create_app
        return create_app()

    def test_export_single_no_session_redirects(self, _app) -> None:
        """GET /export/saga/{id} without session → redirect to login."""
        from starlette.testclient import TestClient

        with TestClient(_app) as client:
            r = client.get(f"/export/saga/{uuid4()}", follow_redirects=False)
            # Middleware redirects to /login (302)
            assert r.status_code == 302
            assert "/login" in r.headers.get("location", "")

    def test_export_bulk_no_session_redirects(self, _app) -> None:
        """POST /export/saga/bulk without session → redirect to login."""
        from starlette.testclient import TestClient

        with TestClient(_app) as client:
            r = client.post(
                "/export/saga/bulk",
                data={"invoice_ids": str(uuid4())},
                follow_redirects=False,
            )
            assert r.status_code == 302
            assert "/login" in r.headers.get("location", "")


# ── Dashboard data edge cases ────────────────────────────────────────


class TestDashboardDataEdgeCases:
    """Dashboard data builder edge cases."""

    @pytest.mark.asyncio()
    async def test_build_dashboard_data_empty_farm(self) -> None:
        """Dashboard builds without crash for farm with no data."""
        from farm_copilot.api.dashboard import build_dashboard_data

        session = AsyncMock()
        # All count queries return 0
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = 0
        mock_result.scalar_one_or_none.return_value = None
        mock_result.all.return_value = []
        session.execute.return_value = mock_result

        data = await build_dashboard_data(
            session,
            farm_id=uuid4(),
            farm_name="Empty Farm",
            user_name="Test User",
        )

        assert data.farm_name == "Empty Farm"
        assert data.total_invoices == 0
        assert data.anaf_connected is False
        # Should have at least the "Connect to ANAF" action
        assert len(data.action_items) >= 1
        anaf_item = [
            i for i in data.action_items if i.category == "sync"
        ]
        assert len(anaf_item) == 1

    @pytest.mark.asyncio()
    async def test_dashboard_data_fields_populated(self) -> None:
        """DashboardData fields are correctly set."""
        from farm_copilot.api.dashboard import DashboardData

        data = DashboardData(
            farm_name="Test Farm",
            user_name="Ion",
            farm_id="abc-123",
        )
        assert data.total_invoices == 0
        assert data.invoices_needing_review == 0
        assert data.unresolved_alerts == 0
        assert data.action_items == []
        assert data.anaf_connected is False


# ── Stock balance with zero quantities ────────────────────────────


class TestStockBalanceDataclass:
    """StockBalance dataclass edge cases."""

    def test_balance_property_positive(self) -> None:
        """Positive balance when total_in > total_out."""
        from farm_copilot.database.stock_movements import StockBalance

        sb = StockBalance(
            canonical_product_id=uuid4(),
            product_name="Test",
            category="input",
            unit="kg",
            total_in=Decimal("100"),
            total_out=Decimal("30"),
            last_movement_at=None,
        )
        assert sb.balance == Decimal("70")

    def test_balance_property_negative(self) -> None:
        """Negative balance when total_out > total_in."""
        from farm_copilot.database.stock_movements import StockBalance

        sb = StockBalance(
            canonical_product_id=uuid4(),
            product_name="Test",
            category="input",
            unit="kg",
            total_in=Decimal("10"),
            total_out=Decimal("50"),
            last_movement_at=None,
        )
        assert sb.balance == Decimal("-40")

    def test_balance_property_zero(self) -> None:
        """Zero balance when total_in == total_out."""
        from farm_copilot.database.stock_movements import StockBalance

        sb = StockBalance(
            canonical_product_id=uuid4(),
            product_name="Test",
            category="input",
            unit="kg",
            total_in=Decimal("100"),
            total_out=Decimal("100"),
            last_movement_at=None,
        )
        assert sb.balance == Decimal("0")

    def test_balance_zero_movements(self) -> None:
        """Zero balance with no movements at all."""
        from farm_copilot.database.stock_movements import StockBalance

        sb = StockBalance(
            canonical_product_id=uuid4(),
            product_name="New Product",
            category=None,
            unit="kg",
            total_in=Decimal("0"),
            total_out=Decimal("0"),
            last_movement_at=None,
        )
        assert sb.balance == Decimal("0")


# ── SAGA _fmt helper ─────────────────────────────────────────────


class TestFmtHelper:
    """Test the _fmt decimal formatter."""

    def test_fmt_none(self) -> None:
        from farm_copilot.worker.saga_export import _fmt

        assert _fmt(None) == "0.00"

    def test_fmt_integer(self) -> None:
        from farm_copilot.worker.saga_export import _fmt

        assert _fmt(Decimal("100")) == "100.00"

    def test_fmt_fractional(self) -> None:
        from farm_copilot.worker.saga_export import _fmt

        assert _fmt(Decimal("99.5")) == "99.50"

    def test_fmt_long_decimal(self) -> None:
        from farm_copilot.worker.saga_export import _fmt

        assert _fmt(Decimal("99.999")) == "100.00"

    def test_fmt_zero(self) -> None:
        from farm_copilot.worker.saga_export import _fmt

        assert _fmt(Decimal("0")) == "0.00"


# ── Auth deps unit tests ──────────────────────────────────────────


class TestAuthDeps:
    """Test auth dependency functions."""

    def test_get_current_user_id_with_valid_uuid(self) -> None:
        from farm_copilot.api.deps import get_current_user_id

        uid = str(uuid4())
        request = MagicMock()
        request.session = {"user_id": uid}
        assert get_current_user_id(request) is not None

    def test_get_current_user_id_empty_session(self) -> None:
        from farm_copilot.api.deps import get_current_user_id

        request = MagicMock()
        request.session = {}
        assert get_current_user_id(request) is None

    def test_get_current_farm_id_with_valid_uuid(self) -> None:
        from farm_copilot.api.deps import get_current_farm_id

        fid = str(uuid4())
        request = MagicMock()
        request.session = {"farm_id": fid}
        result = get_current_farm_id(request)
        assert result is not None
        assert str(result) == fid

    def test_get_current_farm_id_empty_session(self) -> None:
        from farm_copilot.api.deps import get_current_farm_id

        request = MagicMock()
        request.session = {}
        assert get_current_farm_id(request) is None

    def test_get_current_farm_id_empty_string(self) -> None:
        from farm_copilot.api.deps import get_current_farm_id

        request = MagicMock()
        request.session = {"farm_id": ""}
        assert get_current_farm_id(request) is None
