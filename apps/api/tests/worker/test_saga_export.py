"""Tests for SAGA XML export — XML generation and format compliance."""

from __future__ import annotations

from decimal import Decimal

from lxml import etree

from farm_copilot.worker.saga_export import (
    SagaExportInvoice,
    SagaExportLine,
    generate_saga_xml,
    generate_saga_xml_batch,
)


def _sample_lines() -> list[SagaExportLine]:
    """Return two sample SAGA export lines."""
    return [
        SagaExportLine(
            line_order=1,
            description="Azotat de amoniu 34.4%",
            unit="KGM",
            quantity=Decimal("5000"),
            unit_price=Decimal("2.00"),
            line_total=Decimal("10000.00"),
            tax_amount=Decimal("1900.00"),
        ),
        SagaExportLine(
            line_order=2,
            description="Erbicid Glifosat 360 SL",
            unit="LTR",
            quantity=Decimal("200"),
            unit_price=Decimal("15.00"),
            line_total=Decimal("3000.00"),
            tax_amount=Decimal("570.00"),
        ),
    ]


def _sample_invoice(**overrides) -> SagaExportInvoice:
    """Create a sample invoice for testing."""
    defaults = {
        "supplier_name": "SC Agro Distribuție SRL",
        "supplier_cif": "RO12345678",
        "client_name": "Ferma Verde SRL",
        "client_cif": "RO87654321",
        "invoice_number": "FCT-2026-001234",
        "invoice_date": "2026-03-15",
        "due_date": "2026-04-14",
        "currency": "RON",
        "lines": _sample_lines(),
    }
    defaults.update(overrides)
    return SagaExportInvoice(**defaults)


class TestSagaXmlGeneration:
    """XML generation tests."""

    def test_root_tag_is_factura(self) -> None:
        """Single invoice XML has root tag <Factura>."""
        xml = generate_saga_xml(_sample_invoice())
        root = etree.fromstring(xml.encode("utf-8"))
        assert root.tag == "Factura"

    def test_antet_tags_present(self) -> None:
        """Antet contains all required SAGA tags."""
        xml = generate_saga_xml(_sample_invoice())
        root = etree.fromstring(xml.encode("utf-8"))
        antet = root.find("Antet")
        assert antet is not None

        assert antet.findtext("FurnizorNume") == "SC Agro Distribuție SRL"
        assert antet.findtext("FurnizorCIF") == "RO12345678"
        assert antet.findtext("ClientCIF") == "RO87654321"
        assert antet.findtext("FacturaNumar") == "FCT-2026-001234"
        assert antet.findtext("FacturaData") == "2026-03-15"

    def test_line_items_count(self) -> None:
        """Two lines produce two <Linie> elements."""
        xml = generate_saga_xml(_sample_invoice())
        root = etree.fromstring(xml.encode("utf-8"))
        lines = root.findall(".//Linie")
        assert len(lines) == 2
        assert lines[0].findtext("LinieNrCrt") == "1"
        assert lines[1].findtext("LinieNrCrt") == "2"

    def test_sumar_totals(self) -> None:
        """TotalValoare, TotalTVA, Total computed correctly."""
        xml = generate_saga_xml(_sample_invoice())
        root = etree.fromstring(xml.encode("utf-8"))
        sumar = root.find("Sumar")
        assert sumar is not None

        assert sumar.findtext("TotalValoare") == "13000.00"
        assert sumar.findtext("TotalTVA") == "2470.00"
        assert sumar.findtext("Total") == "15470.00"

    def test_decimal_formatting(self) -> None:
        """Amounts formatted with exactly 2 decimal places."""
        xml = generate_saga_xml(_sample_invoice())
        root = etree.fromstring(xml.encode("utf-8"))

        line1 = root.findall(".//Linie")[0]
        assert line1.findtext("Cantitate") == "5000.00"
        assert line1.findtext("Pret") == "2.00"
        assert line1.findtext("Valoare") == "10000.00"

    def test_empty_optional_fields(self) -> None:
        """Null optional fields render as empty tags, not omitted."""
        inv = _sample_invoice(supplier_address=None, supplier_bank=None)
        xml = generate_saga_xml(inv)
        root = etree.fromstring(xml.encode("utf-8"))
        antet = root.find("Antet")

        addr = antet.find("FurnizorAdresa")
        assert addr is not None
        assert (addr.text or "") == ""

    def test_batch_xml(self) -> None:
        """Batch generates multiple <Factura> under root <Facturi>."""
        inv1 = _sample_invoice(invoice_number="INV-001")
        inv2 = _sample_invoice(invoice_number="INV-002")
        xml = generate_saga_xml_batch([inv1, inv2])
        root = etree.fromstring(xml.encode("utf-8"))

        assert root.tag == "Facturi"
        facturas = root.findall("Factura")
        assert len(facturas) == 2

    def test_guid_preserved(self) -> None:
        """Invoice UUID appears in GUID_factura tag."""
        guid = "01234567-89ab-cdef-0123-456789abcdef"
        inv = _sample_invoice(guid=guid)
        xml = generate_saga_xml(inv)
        root = etree.fromstring(xml.encode("utf-8"))
        assert root.find("Antet").findtext("GUID_factura") == guid

    def test_routing_rule(self) -> None:
        """FurnizorCIF != ClientCIF ensures SAGA 'Intrări' routing."""
        inv = _sample_invoice()
        xml = generate_saga_xml(inv)
        root = etree.fromstring(xml.encode("utf-8"))
        antet = root.find("Antet")
        assert antet.findtext("FurnizorCIF") != antet.findtext("ClientCIF")

    def test_romanian_diacritics(self) -> None:
        """Romanian characters (ă, î, ș, ț) preserved in output."""
        inv = _sample_invoice(
            supplier_name="SC Pădure și Țară SRL"
        )
        xml = generate_saga_xml(inv)
        root = etree.fromstring(xml.encode("utf-8"))
        name = root.find("Antet").findtext("FurnizorNume")
        assert "ă" in name
        assert "ș" in name
        assert "Ț" in name

    def test_reverse_charge_flag(self) -> None:
        """Reverse charge maps to Da/Nu correctly."""
        inv_yes = _sample_invoice(reverse_charge=True)
        inv_no = _sample_invoice(reverse_charge=False)

        xml_yes = generate_saga_xml(inv_yes)
        xml_no = generate_saga_xml(inv_no)

        root_yes = etree.fromstring(xml_yes.encode("utf-8"))
        root_no = etree.fromstring(xml_no.encode("utf-8"))

        assert (
            root_yes.find("Antet").findtext("FacturaTaxareInversa")
            == "Da"
        )
        assert (
            root_no.find("Antet").findtext("FacturaTaxareInversa")
            == "Nu"
        )
