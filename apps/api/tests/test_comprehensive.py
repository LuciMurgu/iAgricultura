"""Comprehensive pure-logic tests — mappers, auth, encryption, entities, settings.

These tests cover all gaps in the test suite that don't require a
live database or running server. Route-level tests with TestClient
are in test_hardening.py (export auth) and verified via E2E script.
"""

from __future__ import annotations

from decimal import Decimal
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

# ---------------------------------------------------------------------------
# 1. Middleware path classification (unit test, no app needed)
# ---------------------------------------------------------------------------


class TestMiddlewareConfig:
    """Test middleware public path configuration."""

    def test_public_paths(self) -> None:
        from farm_copilot.api.middleware import AuthRedirectMiddleware

        assert "/login" in AuthRedirectMiddleware.PUBLIC_PATHS
        assert "/register" in AuthRedirectMiddleware.PUBLIC_PATHS
        assert "/health" in AuthRedirectMiddleware.PUBLIC_PATHS

    def test_public_prefixes(self) -> None:
        from farm_copilot.api.middleware import AuthRedirectMiddleware

        assert "/static" in AuthRedirectMiddleware.PUBLIC_PREFIXES
        assert "/anaf" in AuthRedirectMiddleware.PUBLIC_PREFIXES

    def test_dashboard_not_public(self) -> None:
        from farm_copilot.api.middleware import AuthRedirectMiddleware

        assert "/dashboard" not in AuthRedirectMiddleware.PUBLIC_PATHS
        assert not any(
            "/dashboard".startswith(p)
            for p in AuthRedirectMiddleware.PUBLIC_PREFIXES
        )

    def test_invoices_not_public(self) -> None:
        from farm_copilot.api.middleware import AuthRedirectMiddleware

        assert "/invoices" not in AuthRedirectMiddleware.PUBLIC_PATHS

    def test_stock_not_public(self) -> None:
        from farm_copilot.api.middleware import AuthRedirectMiddleware

        assert "/stock" not in AuthRedirectMiddleware.PUBLIC_PATHS

    def test_upload_not_public(self) -> None:
        from farm_copilot.api.middleware import AuthRedirectMiddleware

        assert "/upload" not in AuthRedirectMiddleware.PUBLIC_PATHS

    def test_export_not_public(self) -> None:
        from farm_copilot.api.middleware import AuthRedirectMiddleware

        assert "/export" not in AuthRedirectMiddleware.PUBLIC_PATHS
        assert not any(
            "/export".startswith(p)
            for p in AuthRedirectMiddleware.PUBLIC_PREFIXES
        )

    def test_anaf_status_is_public(self) -> None:
        """ANAF paths begin with /anaf prefix → public."""
        from farm_copilot.api.middleware import AuthRedirectMiddleware

        assert "/anaf/status/123".startswith(AuthRedirectMiddleware.PUBLIC_PREFIXES)

    def test_static_is_public(self) -> None:
        from farm_copilot.api.middleware import AuthRedirectMiddleware

        assert "/static/css/style.css".startswith(AuthRedirectMiddleware.PUBLIC_PREFIXES)


# ---------------------------------------------------------------------------
# 2. Mapper Tests
# ---------------------------------------------------------------------------


class TestMapInvoice:
    """Test map_invoice mapper function."""

    def test_basic_mapping(self) -> None:
        from farm_copilot.worker.mappers import map_invoice

        invoice = MagicMock()
        invoice.id = uuid4()
        invoice.farm_id = uuid4()
        invoice.uploaded_document_id = uuid4()
        invoice.supplier_id = None
        invoice.status = "uploaded"
        invoice.invoice_number = "FCT-001"
        invoice.invoice_date = None
        invoice.due_date = None
        invoice.currency = "RON"
        invoice.subtotal_amount = None
        invoice.tax_amount = None
        invoice.total_amount = None

        result = map_invoice(invoice)
        assert result.id == str(invoice.id)
        assert result.status == "uploaded"
        assert result.invoice_number == "FCT-001"
        assert result.currency == "RON"

    def test_with_dates(self) -> None:
        from datetime import date

        from farm_copilot.worker.mappers import map_invoice

        invoice = MagicMock()
        invoice.id = uuid4()
        invoice.farm_id = uuid4()
        invoice.uploaded_document_id = uuid4()
        invoice.supplier_id = uuid4()
        invoice.status = "validated"
        invoice.invoice_number = "FCT-002"
        invoice.invoice_date = date(2026, 1, 15)
        invoice.due_date = date(2026, 2, 15)
        invoice.currency = "EUR"
        invoice.subtotal_amount = Decimal("1000")
        invoice.tax_amount = Decimal("190")
        invoice.total_amount = Decimal("1190")

        result = map_invoice(invoice)
        assert result.invoice_date == "2026-01-15"
        assert result.due_date == "2026-02-15"
        assert result.supplier_id is not None
        assert result.currency == "EUR"

    def test_enum_status(self) -> None:
        """Status enum .value is extracted."""
        from farm_copilot.worker.mappers import map_invoice

        status_enum = MagicMock()
        status_enum.value = "needs_review"

        invoice = MagicMock()
        invoice.id = uuid4()
        invoice.farm_id = uuid4()
        invoice.uploaded_document_id = uuid4()
        invoice.supplier_id = None
        invoice.status = status_enum
        invoice.invoice_number = None
        invoice.invoice_date = None
        invoice.due_date = None
        invoice.currency = None
        invoice.subtotal_amount = None
        invoice.tax_amount = None
        invoice.total_amount = None

        result = map_invoice(invoice)
        assert result.status == "needs_review"
        assert result.currency == "RON"  # None defaults to RON

    def test_none_currency_defaults(self) -> None:
        from farm_copilot.worker.mappers import map_invoice

        invoice = MagicMock()
        invoice.id = uuid4()
        invoice.farm_id = uuid4()
        invoice.uploaded_document_id = uuid4()
        invoice.supplier_id = None
        invoice.status = "uploaded"
        invoice.invoice_number = None
        invoice.invoice_date = None
        invoice.due_date = None
        invoice.currency = None
        invoice.subtotal_amount = None
        invoice.tax_amount = None
        invoice.total_amount = None

        assert map_invoice(invoice).currency == "RON"


class TestMapLineItem:
    """Test map_line_item mapper function."""

    def test_full_line_item(self) -> None:
        from farm_copilot.worker.mappers import map_line_item

        item = MagicMock()
        item.id = uuid4()
        item.invoice_id = uuid4()
        item.line_order = 1
        item.raw_description = "Azotat de amoniu"
        item.quantity = Decimal("100")
        item.unit = "kg"
        item.unit_price = Decimal("2.50")
        item.line_total = Decimal("250")
        item.tax_rate = Decimal("0.19")
        item.tax_amount = Decimal("47.50")
        item.line_classification = "stockable_input"
        item.canonical_product_id = uuid4()
        item.normalization_confidence = Decimal("0.95")
        item.normalization_method = "exact_match"

        result = map_line_item(item)
        assert result.raw_description == "Azotat de amoniu"
        assert result.quantity == Decimal("100")
        assert result.line_classification == "stockable_input"

    def test_none_line_order_defaults_to_zero(self) -> None:
        from farm_copilot.worker.mappers import map_line_item

        item = MagicMock()
        item.id = uuid4()
        item.invoice_id = uuid4()
        item.line_order = None
        item.raw_description = None
        item.quantity = None
        item.unit = None
        item.unit_price = None
        item.line_total = None
        item.tax_rate = None
        item.tax_amount = None
        item.line_classification = None
        item.canonical_product_id = None
        item.normalization_confidence = None
        item.normalization_method = None

        result = map_line_item(item)
        assert result.line_order == 0
        assert result.canonical_product_id is None

    def test_enum_classification(self) -> None:
        """Line classification enum .value is extracted."""
        from farm_copilot.worker.mappers import map_line_item

        cls_enum = MagicMock()
        cls_enum.value = "service"

        item = MagicMock()
        item.id = uuid4()
        item.invoice_id = uuid4()
        item.line_order = 3
        item.raw_description = "Transport"
        item.quantity = Decimal("1")
        item.unit = "BUC"
        item.unit_price = Decimal("500")
        item.line_total = Decimal("500")
        item.tax_rate = None
        item.tax_amount = None
        item.line_classification = cls_enum
        item.canonical_product_id = None
        item.normalization_confidence = None
        item.normalization_method = None

        result = map_line_item(item)
        assert result.line_classification == "service"


class TestMapCanonicalProduct:
    """Test map_canonical_product."""

    def test_basic(self) -> None:
        from farm_copilot.worker.mappers import map_canonical_product

        row = MagicMock()
        row.id = uuid4()
        row.name = "Azotat de amoniu"
        row.category = "fertilizer"
        row.default_unit = "kg"
        row.active = True

        result = map_canonical_product(row)
        assert result.name == "Azotat de amoniu"
        assert result.category == "fertilizer"
        assert result.active is True

    def test_inactive(self) -> None:
        from farm_copilot.worker.mappers import map_canonical_product

        row = MagicMock()
        row.id = uuid4()
        row.name = "Old product"
        row.category = None
        row.default_unit = None
        row.active = False

        result = map_canonical_product(row)
        assert result.active is False
        assert result.category is None


class TestMapProductAlias:
    """Test map_product_alias."""

    def test_with_farm_id(self) -> None:
        from farm_copilot.worker.mappers import map_product_alias

        row = MagicMock()
        row.id = uuid4()
        row.canonical_product_id = uuid4()
        row.alias_text = "Azot amoniu 33%"
        row.farm_id = uuid4()
        row.supplier_id = None
        row.source = "manual"

        result = map_product_alias(row)
        assert result.alias_text == "Azot amoniu 33%"
        assert result.source == "manual"
        assert result.farm_id is not None
        assert result.supplier_id is None

    def test_without_farm_id(self) -> None:
        from farm_copilot.worker.mappers import map_product_alias

        row = MagicMock()
        row.id = uuid4()
        row.canonical_product_id = uuid4()
        row.alias_text = "System alias"
        row.farm_id = None
        row.supplier_id = None
        row.source = "system"

        result = map_product_alias(row)
        assert result.farm_id is None


# ---------------------------------------------------------------------------
# 3. _str_or_none helper
# ---------------------------------------------------------------------------


class TestStrOrNone:
    """Test the _str_or_none helper."""

    def test_none(self) -> None:
        from farm_copilot.worker.mappers import _str_or_none

        assert _str_or_none(None) is None

    def test_uuid(self) -> None:
        from farm_copilot.worker.mappers import _str_or_none

        uid = uuid4()
        assert _str_or_none(uid) == str(uid)

    def test_int(self) -> None:
        from farm_copilot.worker.mappers import _str_or_none

        assert _str_or_none(42) == "42"

    def test_empty_string(self) -> None:
        from farm_copilot.worker.mappers import _str_or_none

        assert _str_or_none("") == ""


# ---------------------------------------------------------------------------
# 4. Line Correction Result Types
# ---------------------------------------------------------------------------


class TestLineCorrectionTypes:
    """Test line correction result dataclasses."""

    def test_applied(self) -> None:
        from farm_copilot.worker.line_correction import LineCorrectionApplied

        r = LineCorrectionApplied(
            line_item_id="abc",
            new_canonical_product_id="def",
        )
        assert r.kind == "applied"

    def test_already_mapped(self) -> None:
        from farm_copilot.worker.line_correction import LineCorrectionAlreadyMapped

        r = LineCorrectionAlreadyMapped(
            line_item_id="abc",
            existing_canonical_product_id="def",
        )
        assert r.kind == "already_mapped"

    def test_not_found(self) -> None:
        from farm_copilot.worker.line_correction import LineCorrectionNotFound

        r = LineCorrectionNotFound(reason="Invoice not found")
        assert r.kind == "not_found"
        assert "not found" in r.reason.lower()

    def test_result_union_type(self) -> None:
        from farm_copilot.worker.line_correction import (
            LineCorrectionAlreadyMapped,
            LineCorrectionApplied,
            LineCorrectionNotFound,
        )

        # All three types are part of the union
        applied = LineCorrectionApplied()
        assert isinstance(applied, LineCorrectionApplied)

        mapped = LineCorrectionAlreadyMapped()
        assert isinstance(mapped, LineCorrectionAlreadyMapped)

        not_found = LineCorrectionNotFound()
        assert isinstance(not_found, LineCorrectionNotFound)


# ---------------------------------------------------------------------------
# 5. Auth password hashing
# ---------------------------------------------------------------------------


class TestAuthPasswordHashing:
    """Test bcrypt password hashing and verification."""

    def test_hash_and_verify(self) -> None:
        from farm_copilot.api.auth import hash_password, verify_password

        h = hash_password("MySecurePassword123!")
        assert verify_password("MySecurePassword123!", h) is True

    def test_wrong_password_fails(self) -> None:
        from farm_copilot.api.auth import hash_password, verify_password

        h = hash_password("CorrectPassword")
        assert verify_password("WrongPassword", h) is False

    def test_different_hashes_for_same_password(self) -> None:
        """bcrypt random salt — same password produces different hashes."""
        from farm_copilot.api.auth import hash_password

        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2

    def test_empty_password(self) -> None:
        from farm_copilot.api.auth import hash_password, verify_password

        h = hash_password("")
        assert verify_password("", h) is True
        assert verify_password("notempty", h) is False

    def test_unicode_password(self) -> None:
        """Romanian diacritics survive hashing."""
        from farm_copilot.api.auth import hash_password, verify_password

        h = hash_password("Parolă cu diacritice și ăîșț")
        assert verify_password("Parolă cu diacritice și ăîșț", h) is True

    def test_long_password(self) -> None:
        """Long passwords are truncated to 72 bytes (bcrypt limit)."""
        from farm_copilot.api.auth import hash_password, verify_password

        pwd = "A" * 200
        h = hash_password(pwd)  # Should not crash
        assert verify_password(pwd, h) is True


# ---------------------------------------------------------------------------
# 6. Encryption
# ---------------------------------------------------------------------------


class TestEncryption:
    """Test encryption/decryption round-trip."""

    def test_round_trip(self) -> None:
        from farm_copilot.database.encryption import decrypt_token, encrypt_token

        original = "my-secret-token-abc123"
        encrypted = encrypt_token(original)
        assert encrypted != original
        assert decrypt_token(encrypted) == original

    def test_empty_string(self) -> None:
        from farm_copilot.database.encryption import decrypt_token, encrypt_token

        assert decrypt_token(encrypt_token("")) == ""

    def test_unicode(self) -> None:
        """Romanian diacritics survive encryption."""
        from farm_copilot.database.encryption import decrypt_token, encrypt_token

        original = "token-cu-ăîșțâ"
        assert decrypt_token(encrypt_token(original)) == original

    def test_different_ciphertexts(self) -> None:
        """Fernet uses random IV — same plaintext produces different ciphertext."""
        from farm_copilot.database.encryption import encrypt_token

        e1 = encrypt_token("same-token")
        e2 = encrypt_token("same-token")
        assert e1 != e2

    def test_long_token(self) -> None:
        from farm_copilot.database.encryption import decrypt_token, encrypt_token

        original = "x" * 10000
        assert decrypt_token(encrypt_token(original)) == original


# ---------------------------------------------------------------------------
# 7. Domain entities
# ---------------------------------------------------------------------------


class TestDomainEntities:
    """Test domain entity dataclasses."""

    def test_invoice_entity(self) -> None:
        from farm_copilot.domain.entities import Invoice

        inv = Invoice(
            id="1", farm_id="2", uploaded_document_id="3",
            supplier_id=None, status="uploaded",
            invoice_number=None, invoice_date=None, due_date=None,
            currency="RON", subtotal_amount=None,
            tax_amount=None, total_amount=None,
        )
        assert inv.id == "1"
        assert inv.status == "uploaded"

    def test_invoice_frozen(self) -> None:
        """Domain entities are frozen (immutable)."""
        from farm_copilot.domain.entities import Invoice

        inv = Invoice(
            id="1", farm_id="2", uploaded_document_id="3",
            supplier_id=None, status="uploaded",
            invoice_number=None, invoice_date=None, due_date=None,
            currency="RON", subtotal_amount=None,
            tax_amount=None, total_amount=None,
        )
        with pytest.raises(AttributeError):
            inv.status = "changed"  # type: ignore[misc]

    def test_line_item_entity(self) -> None:
        from farm_copilot.domain.entities import InvoiceLineItem

        item = InvoiceLineItem(
            id="1", invoice_id="2", line_order=1,
            raw_description="Test", quantity=Decimal("10"),
            unit="kg", unit_price=Decimal("5"),
            line_total=Decimal("50"), tax_rate=Decimal("0.19"),
            tax_amount=Decimal("9.50"), line_classification="stockable_input",
            canonical_product_id=None, normalization_confidence=None,
            normalization_method=None,
        )
        assert item.line_total == Decimal("50")

    def test_canonical_product(self) -> None:
        from farm_copilot.domain.entities import CanonicalProduct

        p = CanonicalProduct(
            id="1", name="Azotat", category="fertilizer",
            default_unit="kg", active=True,
        )
        assert p.name == "Azotat"
        assert p.active is True

    def test_product_alias(self) -> None:
        from farm_copilot.domain.entities import ProductAlias

        a = ProductAlias(
            id="1", canonical_product_id="2",
            alias_text="Azot 33.5%",
            farm_id=None, supplier_id=None, source="system",
        )
        assert a.alias_text == "Azot 33.5%"


# ---------------------------------------------------------------------------
# 8. Invoice status enum
# ---------------------------------------------------------------------------


class TestInvoiceStatusEnum:
    """Test InvoiceStatus enum."""

    def test_has_core_statuses(self) -> None:
        from farm_copilot.database.models import InvoiceStatus

        values = [s.value for s in InvoiceStatus]
        assert "uploaded" in values
        assert "needs_review" in values
        assert len(values) >= 3

    def test_values_are_strings(self) -> None:
        from farm_copilot.database.models import InvoiceStatus

        for s in InvoiceStatus:
            assert isinstance(s.value, str)


# ---------------------------------------------------------------------------
# 9. Dashboard ActionItem dataclass
# ---------------------------------------------------------------------------


class TestDashboardDataclasses:
    """Test dashboard data structures."""

    def test_action_item(self) -> None:
        from farm_copilot.api.dashboard import ActionItem

        item = ActionItem(
            priority=1,
            icon="🚨",
            title="Critical alert",
            detail="Something is wrong",
            action_url="/invoice/123",
            action_label="Review",
            category="alert",
        )
        assert item.priority == 1
        assert item.category == "alert"

    def test_dashboard_data_defaults(self) -> None:
        from farm_copilot.api.dashboard import DashboardData

        data = DashboardData(
            farm_name="Test", user_name="Ion", farm_id="abc",
        )
        assert data.total_invoices == 0
        assert data.action_items == []
        assert data.anaf_connected is False
        assert data.anaf_last_sync is None

    def test_action_items_sortable(self) -> None:
        from farm_copilot.api.dashboard import ActionItem

        items = [
            ActionItem(priority=3, icon="", title="", detail="",
                       action_url="", action_label="", category=""),
            ActionItem(priority=1, icon="", title="", detail="",
                       action_url="", action_label="", category=""),
            ActionItem(priority=2, icon="", title="", detail="",
                       action_url="", action_label="", category=""),
        ]
        items.sort(key=lambda x: x.priority)
        assert [i.priority for i in items] == [1, 2, 3]


# ---------------------------------------------------------------------------
# 10. Scheduler + ANAF settings
# ---------------------------------------------------------------------------


class TestSettings:
    """Test settings classes."""

    def test_scheduler_settings(self) -> None:
        from farm_copilot.worker.scheduler import SchedulerSettings

        s = SchedulerSettings(
            anaf_sync_enabled=True,
            anaf_sync_interval_seconds=14400,
            anaf_sync_initial_delay_seconds=60,
        )
        assert s.anaf_sync_enabled is True
        assert s.anaf_sync_interval_seconds == 14400

    def test_scheduler_disabled(self) -> None:
        from farm_copilot.worker.scheduler import SchedulerSettings

        s = SchedulerSettings(
            anaf_sync_enabled=False,
            anaf_sync_interval_seconds=14400,
            anaf_sync_initial_delay_seconds=60,
        )
        assert s.anaf_sync_enabled is False

    def test_anaf_settings_type(self) -> None:
        from farm_copilot.api.anaf_settings import AnafSettings

        s = AnafSettings()
        assert isinstance(s.anaf_test_mode, bool)

    def test_app_settings(self) -> None:
        from farm_copilot.api.deps import AppSettings

        s = AppSettings(session_secret_key="test-123")
        assert s.session_secret_key == "test-123"


# ---------------------------------------------------------------------------
# 11. Circuit Breaker
# ---------------------------------------------------------------------------


class TestCircuitBreaker:
    """Test circuit breaker logic."""

    def test_circuit_breaker_starts_closed(self) -> None:
        from farm_copilot.worker.circuit_breaker import CircuitBreaker

        cb = CircuitBreaker(failure_threshold=3, cooldown_seconds=60)
        assert cb.state == "closed"

    def test_circuit_breaker_opens_after_threshold(self) -> None:
        from farm_copilot.worker.circuit_breaker import CircuitBreaker

        cb = CircuitBreaker(failure_threshold=2, cooldown_seconds=60)
        cb.record_failure()
        assert cb.state == "closed"
        cb.record_failure()
        assert cb.state == "open"

    def test_circuit_breaker_resets_on_success(self) -> None:
        from farm_copilot.worker.circuit_breaker import CircuitBreaker

        cb = CircuitBreaker(failure_threshold=3, cooldown_seconds=60)
        cb.record_failure()
        cb.record_success()
        assert cb.state == "closed"
        assert cb._failure_count == 0

    def test_circuit_breaker_reset_method(self) -> None:
        from farm_copilot.worker.circuit_breaker import CircuitBreaker

        cb = CircuitBreaker(failure_threshold=2, cooldown_seconds=60)
        cb.record_failure()
        cb.record_failure()
        assert cb.state == "open"
        cb.reset()
        assert cb.state == "closed"
        assert cb._failure_count == 0

    def test_can_execute_when_closed(self) -> None:
        from farm_copilot.worker.circuit_breaker import CircuitBreaker

        cb = CircuitBreaker(failure_threshold=3, cooldown_seconds=60)
        assert cb.can_execute() is True

    def test_cannot_execute_when_open(self) -> None:
        from farm_copilot.worker.circuit_breaker import CircuitBreaker

        cb = CircuitBreaker(failure_threshold=1, cooldown_seconds=9999)
        cb.record_failure()
        assert cb.state == "open"
        assert cb.can_execute() is False


# ---------------------------------------------------------------------------
# 12. ANAF Client Config
# ---------------------------------------------------------------------------


class TestAnafClientConfig:
    """Test ANAF client configuration."""

    def test_default_config(self) -> None:
        from farm_copilot.worker.anaf_client import AnafClientConfig

        config = AnafClientConfig()
        assert config.base_url  # Not empty
        assert "anaf" in config.base_url.lower() or "http" in config.base_url.lower()

    def test_custom_base_url(self) -> None:
        from farm_copilot.worker.anaf_client import AnafClientConfig

        config = AnafClientConfig(base_url="http://test.local")
        assert config.base_url == "http://test.local"

    def test_test_base_url_constant(self) -> None:
        from farm_copilot.worker.anaf_client import ANAF_TEST_BASE

        assert "anaf" in ANAF_TEST_BASE.lower() or "test" in ANAF_TEST_BASE.lower()
