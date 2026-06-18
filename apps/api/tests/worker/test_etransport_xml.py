"""Tests for e-Transport XML generator and NC tariff codes.

Pure-logic tests — constructs mock objects, no database needed.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

from lxml import etree

from farm_copilot.domain.nc_tariff_codes import (
    DEFAULT_NC_CODE,
    NC_CODES,
    get_nc_code,
)
from farm_copilot.worker.etransport_xml import (
    _format_decimal,
    generate_confirmation_xml,
    generate_deletion_xml,
    generate_notification_xml,
)

# ---------------------------------------------------------------------------
# Lightweight mock objects (avoid importing SQLAlchemy models)
# ---------------------------------------------------------------------------


@dataclass
class MockDeclaration:
    sender_cif: str = "RO12345678"
    reference: str = "FC-2026-0042"
    operation_type: int = 10
    operation_scope: int = 101
    departure_date: date = field(default_factory=lambda: date(2026, 4, 5))
    receiver_country: str = "RO"
    receiver_cif: str = "RO87654321"
    receiver_name: str = "Agro Buyer SRL"
    load_country: str = "RO"
    load_county: str | None = "IS"
    load_city: str = "Iași"
    load_street: str | None = "Str. Fermei 10"
    load_postal_code: str | None = "700100"
    unload_country: str = "RO"
    unload_county: str | None = "BT"
    unload_city: str = "Botoșani"
    unload_street: str | None = None
    unload_postal_code: str | None = None
    vehicle_plate: str | None = "IS-01-ABC"
    carrier_cif: str | None = "RO11111111"
    carrier_name: str | None = "Trans Agro SRL"
    carrier_country: str = "RO"


@dataclass
class MockItem:
    line_order: int = 1
    nc_tariff_code: str = "1001"
    product_description: str = "Grâu alimentar"
    quantity: Decimal = Decimal("25000.00")
    unit: str = "KGM"
    net_weight_kg: Decimal = Decimal("25000.00")
    gross_weight_kg: Decimal = Decimal("25500.00")
    operation_scope: int = 101
    value_ron: Decimal = Decimal("50000.00")


# ---------------------------------------------------------------------------
# Notification XML tests
# ---------------------------------------------------------------------------


class TestNotificationXml:
    def test_valid_structure(self) -> None:
        """Generated XML should parse and have correct root element."""
        xml = generate_notification_xml(MockDeclaration(), [MockItem()])  # type: ignore[arg-type]
        root = etree.fromstring(xml.encode("utf-8"))
        assert root.tag.endswith("eTransport")
        assert "notificare" in [
            etree.QName(el).localname for el in root
        ]

    def test_sender_cif_in_attribute(self) -> None:
        """codDeclarant attribute should match sender_cif."""
        decl = MockDeclaration(sender_cif="RO99999999")
        xml = generate_notification_xml(decl, [MockItem()])  # type: ignore[arg-type]
        root = etree.fromstring(xml.encode("utf-8"))
        assert root.get("codDeclarant") == "RO99999999"

    def test_reference_in_attribute(self) -> None:
        """refDeclarant attribute should match reference."""
        decl = MockDeclaration(reference="TEST-REF-001")
        xml = generate_notification_xml(decl, [MockItem()])  # type: ignore[arg-type]
        root = etree.fromstring(xml.encode("utf-8"))
        assert root.get("refDeclarant") == "TEST-REF-001"

    def test_goods_present(self) -> None:
        """bunuri element should contain correct field values."""
        xml = generate_notification_xml(MockDeclaration(), [MockItem()])  # type: ignore[arg-type]
        root = etree.fromstring(xml.encode("utf-8"))
        ns = {"ns": "mfp:anaf:dgti:eTransport:declaratie:v2"}
        bunuri = root.findall(".//ns:bunuri", ns)
        assert len(bunuri) == 1
        code = bunuri[0].find("ns:codTarifar", ns)
        assert code is not None
        assert code.text == "1001"

    def test_multiple_goods(self) -> None:
        """Multiple items produce multiple bunuri elements."""
        items = [
            MockItem(line_order=1, nc_tariff_code="1001"),
            MockItem(line_order=2, nc_tariff_code="3102"),
            MockItem(line_order=3, nc_tariff_code="2710"),
        ]
        xml = generate_notification_xml(MockDeclaration(), items)  # type: ignore[arg-type]
        root = etree.fromstring(xml.encode("utf-8"))
        ns = {"ns": "mfp:anaf:dgti:eTransport:declaratie:v2"}
        bunuri = root.findall(".//ns:bunuri", ns)
        assert len(bunuri) == 3

    def test_no_vehicle_no_transport_element(self) -> None:
        """No vehicle plate → no dateTransport element."""
        decl = MockDeclaration(vehicle_plate=None)
        xml = generate_notification_xml(decl, [MockItem()])  # type: ignore[arg-type]
        root = etree.fromstring(xml.encode("utf-8"))
        ns = {"ns": "mfp:anaf:dgti:eTransport:declaratie:v2"}
        transport = root.findall(".//ns:dateTransport", ns)
        assert len(transport) == 0

    def test_with_vehicle(self) -> None:
        """Vehicle plate → dateTransport element present."""
        xml = generate_notification_xml(MockDeclaration(), [MockItem()])  # type: ignore[arg-type]
        root = etree.fromstring(xml.encode("utf-8"))
        ns = {"ns": "mfp:anaf:dgti:eTransport:declaratie:v2"}
        transport = root.findall(".//ns:dateTransport", ns)
        assert len(transport) == 1

    def test_departure_date_format(self) -> None:
        """Departure date should be ISO format."""
        decl = MockDeclaration(departure_date=date(2026, 6, 15))
        xml = generate_notification_xml(decl, [MockItem()])  # type: ignore[arg-type]
        assert "2026-06-15" in xml


# ---------------------------------------------------------------------------
# Deletion XML tests
# ---------------------------------------------------------------------------


class TestDeletionXml:
    def test_contains_uit(self) -> None:
        """stergere element should contain UIT code."""
        xml = generate_deletion_xml("RO12345678", "UIT-ABC-123", "REF-001")
        root = etree.fromstring(xml.encode("utf-8"))
        ns = {"ns": "mfp:anaf:dgti:eTransport:declaratie:v2"}
        stergere = root.find(".//ns:stergere", ns)
        assert stergere is not None
        uit = stergere.find("ns:uit", ns)
        assert uit is not None
        assert uit.text == "UIT-ABC-123"


# ---------------------------------------------------------------------------
# Confirmation XML tests
# ---------------------------------------------------------------------------


class TestConfirmationXml:
    def test_type_code(self) -> None:
        """confirmare should have tipConfirmare."""
        xml = generate_confirmation_xml(
            "RO12345678", "UIT-ABC-123", "REF-001", confirmation_type="20"
        )
        root = etree.fromstring(xml.encode("utf-8"))
        ns = {"ns": "mfp:anaf:dgti:eTransport:declaratie:v2"}
        confirmare = root.find(".//ns:confirmare", ns)
        assert confirmare is not None
        tip = confirmare.find("ns:tipConfirmare", ns)
        assert tip is not None
        assert tip.text == "20"

    def test_with_observations(self) -> None:
        """Observations text should appear when provided."""
        xml = generate_confirmation_xml(
            "RO12345678",
            "UIT-ABC-123",
            "REF-001",
            observations="Totul OK",
        )
        assert "Totul OK" in xml

    def test_without_observations(self) -> None:
        """No observatii element when not provided."""
        xml = generate_confirmation_xml(
            "RO12345678", "UIT-ABC-123", "REF-001"
        )
        assert "observatii" not in xml


# ---------------------------------------------------------------------------
# NC code tests
# ---------------------------------------------------------------------------


class TestNcTariffCodes:
    def test_known_category(self) -> None:
        """Known category returns correct NC code."""
        code, desc = get_nc_code("fertilizer")
        assert code == "3102"

    def test_unknown_category(self) -> None:
        """Unknown category returns default."""
        code, desc = get_nc_code("unknown_stuff")
        assert (code, desc) == DEFAULT_NC_CODE

    def test_none_category(self) -> None:
        """None category returns default."""
        code, desc = get_nc_code(None)
        assert (code, desc) == DEFAULT_NC_CODE

    def test_override_takes_precedence(self) -> None:
        """Product-level nc_code override wins over category."""
        code, desc = get_nc_code(
            "fertilizer", nc_code_override="3105"
        )
        assert code == "3105"

    def test_all_codes_at_least_4_digits(self) -> None:
        """All NC codes must be at least 4 digits."""
        for category, entries in NC_CODES.items():
            for code, _desc in entries:
                assert len(code) >= 4, (
                    f"Category '{category}' has short code: {code}"
                )

    def test_fuel_category(self) -> None:
        code, _ = get_nc_code("fuel")
        assert code == "2710"

    def test_seed_category(self) -> None:
        code, _ = get_nc_code("seed")
        assert code == "1209"


# ---------------------------------------------------------------------------
# Decimal formatting tests
# ---------------------------------------------------------------------------


class TestFormatDecimal:
    def test_two_decimal_places(self) -> None:
        assert _format_decimal(Decimal("100")) == "100.00"

    def test_preserves_values(self) -> None:
        assert _format_decimal(Decimal("25000.50")) == "25000.50"

    def test_no_scientific_notation(self) -> None:
        result = _format_decimal(Decimal("1E+4"))
        assert "E" not in result
        assert result == "10000.00"
