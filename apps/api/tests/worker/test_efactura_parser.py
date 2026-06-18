"""Tests for farm_copilot.worker.efactura_parser."""

from __future__ import annotations

from pathlib import Path

from farm_copilot.worker.efactura_parser import (
    EFacturaExtractionResult,
    parse_efactura_xml,
)

# ---------------------------------------------------------------------------
# Fixture
# ---------------------------------------------------------------------------

_FIXTURE_DIR = Path(__file__).resolve().parent.parent / "fixtures"


def _load_fixture(name: str) -> str:
    return (_FIXTURE_DIR / name).read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# Happy path — valid e-Factura UBL 2.1 XML
# ---------------------------------------------------------------------------


class TestHappyPath:
    def _parsed(self) -> EFacturaExtractionResult:
        result = parse_efactura_xml(_load_fixture("efactura_sample.xml"))
        assert isinstance(result, EFacturaExtractionResult)
        return result

    def test_kind_parsed(self) -> None:
        assert self._parsed().kind == "parsed"

    def test_invoice_number(self) -> None:
        assert self._parsed().invoice_number == "FCT-2026-001234"

    def test_invoice_date(self) -> None:
        assert self._parsed().invoice_date == "2026-03-15"

    def test_due_date(self) -> None:
        assert self._parsed().due_date == "2026-04-14"

    def test_currency(self) -> None:
        assert self._parsed().currency == "RON"

    def test_subtotal_amount(self) -> None:
        assert self._parsed().subtotal_amount == "13000.00"

    def test_tax_amount(self) -> None:
        assert self._parsed().tax_amount == "2470.00"

    def test_total_amount(self) -> None:
        assert self._parsed().total_amount == "15470.00"

    def test_supplier_name(self) -> None:
        assert self._parsed().supplier_name == "SC Agro Distribuție SRL"

    def test_supplier_tax_id(self) -> None:
        assert self._parsed().supplier_tax_id == "RO12345678"


# ---------------------------------------------------------------------------
# Multi-line extraction
# ---------------------------------------------------------------------------


class TestMultiLine:
    def _parsed(self) -> EFacturaExtractionResult:
        result = parse_efactura_xml(_load_fixture("efactura_sample.xml"))
        assert isinstance(result, EFacturaExtractionResult)
        return result

    def test_line_count(self) -> None:
        assert len(self._parsed().line_items) == 2

    def test_line1_description(self) -> None:
        assert self._parsed().line_items[0].raw_description == "Azotat de amoniu 34.4%"

    def test_line1_quantity(self) -> None:
        assert self._parsed().line_items[0].quantity == "5000"

    def test_line1_unit(self) -> None:
        assert self._parsed().line_items[0].unit == "KGM"

    def test_line1_unit_price(self) -> None:
        assert self._parsed().line_items[0].unit_price == "2.00"

    def test_line1_line_total(self) -> None:
        assert self._parsed().line_items[0].line_total == "10000.00"

    def test_line1_tax_rate(self) -> None:
        assert self._parsed().line_items[0].tax_rate == "19"

    def test_line1_tax_amount(self) -> None:
        assert self._parsed().line_items[0].tax_amount == "1900.00"

    def test_line1_line_order(self) -> None:
        assert self._parsed().line_items[0].line_order == 1

    def test_line2_description(self) -> None:
        assert self._parsed().line_items[1].raw_description == "Erbicid Glifosat 360 SL"

    def test_line2_quantity(self) -> None:
        assert self._parsed().line_items[1].quantity == "200"

    def test_line2_unit(self) -> None:
        assert self._parsed().line_items[1].unit == "LTR"

    def test_line2_unit_price(self) -> None:
        assert self._parsed().line_items[1].unit_price == "15.00"

    def test_line2_line_total(self) -> None:
        assert self._parsed().line_items[1].line_total == "3000.00"

    def test_line2_line_order(self) -> None:
        assert self._parsed().line_items[1].line_order == 2

    def test_raw_xml_preserved(self) -> None:
        xml = _load_fixture("efactura_sample.xml")
        result = parse_efactura_xml(xml)
        assert isinstance(result, EFacturaExtractionResult)
        assert result.raw_xml == xml


# ---------------------------------------------------------------------------
# Multi-line 3+
# ---------------------------------------------------------------------------


class TestThreePlusLines:
    def test_three_lines_parsed(self) -> None:
        xml = """<?xml version="1.0"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:ID>INV-3LINES</cbc:ID>
  <cac:InvoiceLine><cbc:InvoicedQuantity>1</cbc:InvoicedQuantity>
    <cac:Item><cbc:Name>Line A</cbc:Name></cac:Item></cac:InvoiceLine>
  <cac:InvoiceLine><cbc:InvoicedQuantity>2</cbc:InvoicedQuantity>
    <cac:Item><cbc:Name>Line B</cbc:Name></cac:Item></cac:InvoiceLine>
  <cac:InvoiceLine><cbc:InvoicedQuantity>3</cbc:InvoicedQuantity>
    <cac:Item><cbc:Name>Line C</cbc:Name></cac:Item></cac:InvoiceLine>
</Invoice>"""
        result = parse_efactura_xml(xml)
        assert isinstance(result, EFacturaExtractionResult)
        assert len(result.line_items) == 3
        assert result.line_items[0].line_order == 1
        assert result.line_items[1].line_order == 2
        assert result.line_items[2].line_order == 3
        assert result.line_items[2].raw_description == "Line C"


# ---------------------------------------------------------------------------
# Error cases
# ---------------------------------------------------------------------------


class TestMalformedXml:
    def test_empty_string(self) -> None:
        result = parse_efactura_xml("")
        assert result.kind == "malformed_xml"

    def test_whitespace_only(self) -> None:
        result = parse_efactura_xml("   \n\t  ")
        assert result.kind == "malformed_xml"

    def test_broken_tags(self) -> None:
        result = parse_efactura_xml("<Invoice><unclosed")
        assert result.kind == "malformed_xml"


class TestUnsupportedFormat:
    def test_non_invoice_root(self) -> None:
        xml = '<?xml version="1.0"?><root><child>value</child></root>'
        result = parse_efactura_xml(xml)
        assert result.kind == "unsupported_format"

    def test_credit_note(self) -> None:
        xml = '<?xml version="1.0"?><CreditNote><ID>CN-001</ID></CreditNote>'
        result = parse_efactura_xml(xml)
        assert result.kind == "unsupported_format"


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


class TestMissingFields:
    def test_missing_due_date(self) -> None:
        xml = """<?xml version="1.0"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>INV-001</cbc:ID>
  <cbc:IssueDate>2026-01-01</cbc:IssueDate>
</Invoice>"""
        result = parse_efactura_xml(xml)
        assert isinstance(result, EFacturaExtractionResult)
        assert result.invoice_number == "INV-001"
        assert result.invoice_date == "2026-01-01"
        assert result.due_date is None
        assert result.currency is None
        assert result.line_items == []


class TestSingleLine:
    def test_single_line_item(self) -> None:
        xml = """<?xml version="1.0"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:ID>INV-SINGLE</cbc:ID>
  <cac:InvoiceLine>
    <cbc:InvoicedQuantity unitCode="KGM">100</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount>500.00</cbc:LineExtensionAmount>
    <cac:Item><cbc:Name>Uree 46%</cbc:Name></cac:Item>
    <cac:Price><cbc:PriceAmount>5.00</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>
</Invoice>"""
        result = parse_efactura_xml(xml)
        assert isinstance(result, EFacturaExtractionResult)
        assert len(result.line_items) == 1
        assert result.line_items[0].raw_description == "Uree 46%"
        assert result.line_items[0].quantity == "100"
        assert result.line_items[0].unit == "KGM"
        assert result.line_items[0].unit_price == "5.00"
        assert result.line_items[0].line_total == "500.00"


class TestSupplierFallback:
    def test_uses_registration_name(self) -> None:
        xml = """<?xml version="1.0"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:ID>INV-FB</cbc:ID>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>Fallback Supplier SRL</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
</Invoice>"""
        result = parse_efactura_xml(xml)
        assert isinstance(result, EFacturaExtractionResult)
        assert result.supplier_name == "Fallback Supplier SRL"


class TestTaxAmountFallback:
    def test_computed_from_totals(self) -> None:
        xml = """<?xml version="1.0"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:ID>INV-TAX</cbc:ID>
  <cac:LegalMonetaryTotal>
    <cbc:TaxExclusiveAmount>1000.00</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount>1190.00</cbc:TaxInclusiveAmount>
  </cac:LegalMonetaryTotal>
</Invoice>"""
        result = parse_efactura_xml(xml)
        assert isinstance(result, EFacturaExtractionResult)
        assert result.subtotal_amount == "1000.00"
        assert result.total_amount == "1190.00"
        assert result.tax_amount == "190.00"


class TestDecimalPrecision:
    def test_precision_preserved(self) -> None:
        """13000.00 should stay as '13000.00', not become '13000'."""
        result = parse_efactura_xml(_load_fixture("efactura_sample.xml"))
        assert isinstance(result, EFacturaExtractionResult)
        assert result.subtotal_amount == "13000.00"
        assert result.total_amount == "15470.00"
        assert result.tax_amount == "2470.00"


# ---------------------------------------------------------------------------
# Namespace handling
# ---------------------------------------------------------------------------


class TestNamespaceHandling:
    def test_full_namespaced_xml_parses(self) -> None:
        """Verify full UBL 2.1 namespaced XML parses correctly."""
        result = parse_efactura_xml(_load_fixture("efactura_sample.xml"))
        assert isinstance(result, EFacturaExtractionResult)
        assert result.kind == "parsed"
        assert result.invoice_number == "FCT-2026-001234"
        assert len(result.line_items) == 2

    def test_non_namespaced_also_works(self) -> None:
        """Plain XML without namespaces should also parse."""
        xml = """<?xml version="1.0"?>
<Invoice>
  <ID>PLAIN-001</ID>
  <IssueDate>2026-06-01</IssueDate>
  <InvoiceLine>
    <InvoicedQuantity unitCode="KGM">50</InvoicedQuantity>
    <LineExtensionAmount>250.00</LineExtensionAmount>
    <Item><Name>Test Product</Name></Item>
    <Price><PriceAmount>5.00</PriceAmount></Price>
  </InvoiceLine>
</Invoice>"""
        result = parse_efactura_xml(xml)
        assert isinstance(result, EFacturaExtractionResult)
        assert result.invoice_number == "PLAIN-001"
        assert len(result.line_items) == 1
        assert result.line_items[0].unit == "KGM"
