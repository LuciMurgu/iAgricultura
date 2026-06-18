"""Tests for farm_copilot.contracts — Pydantic DTO validation."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError

from farm_copilot.contracts import (
    CanonicalProductResponse,
    InvoiceLineItemResponse,
    InvoiceResponse,
    InvoiceUploadRequest,
    LineCorrectionRequest,
    UploadedDocumentResponse,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

_NOW = datetime(2026, 4, 4, 12, 0, 0)
_TODAY = date(2026, 4, 4)
_UUID1 = uuid4()
_UUID2 = uuid4()
_UUID3 = uuid4()


def _invoice_attrs() -> dict:
    return {
        "id": _UUID1,
        "farm_id": _UUID2,
        "uploaded_document_id": _UUID3,
        "supplier_id": None,
        "status": "uploaded",
        "invoice_number": "INV-001",
        "invoice_date": _TODAY,
        "due_date": None,
        "currency": "RON",
        "subtotal_amount": Decimal("1000.00"),
        "tax_amount": Decimal("190.00"),
        "total_amount": Decimal("1190.00"),
        "extraction_method": "xml_deterministic",
        "notes": None,
        "created_at": _NOW,
        "updated_at": _NOW,
    }


def _line_item_attrs() -> dict:
    return {
        "id": uuid4(),
        "invoice_id": _UUID1,
        "line_order": 1,
        "raw_description": "Seminte porumb",
        "quantity": Decimal("100.0000"),
        "unit": "kg",
        "unit_price": Decimal("10.0000"),
        "line_total": Decimal("1000.00"),
        "tax_rate": Decimal("19.00"),
        "tax_amount": Decimal("190.00"),
        "line_classification": "stockable_input",
        "canonical_product_id": uuid4(),
        "normalization_confidence": Decimal("0.950"),
        "normalization_method": "exact_alias",
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestInvoiceResponseFromAttributes:
    def test_all_fields_populated(self) -> None:
        model = InvoiceResponse.model_validate(_invoice_attrs())
        assert model.id == _UUID1
        assert model.farm_id == _UUID2
        assert model.status == "uploaded"
        assert model.subtotal_amount == Decimal("1000.00")
        assert model.created_at == _NOW

    def test_nullable_fields(self) -> None:
        attrs = _invoice_attrs()
        attrs["supplier_id"] = None
        attrs["notes"] = None
        model = InvoiceResponse.model_validate(attrs)
        assert model.supplier_id is None
        assert model.notes is None


class TestInvoiceLineItemResponseFromAttributes:
    def test_all_fields_populated(self) -> None:
        attrs = _line_item_attrs()
        model = InvoiceLineItemResponse.model_validate(attrs)
        assert model.line_order == 1
        assert model.quantity == Decimal("100.0000")
        assert model.line_classification == "stockable_input"
        assert model.normalization_confidence == Decimal("0.950")


class TestInvoiceUploadRequestValidation:
    def test_valid_uuid_accepted(self) -> None:
        req = InvoiceUploadRequest(farm_id=uuid4())
        assert isinstance(req.farm_id, UUID)

    def test_invalid_string_rejected(self) -> None:
        with pytest.raises(ValidationError):
            InvoiceUploadRequest(farm_id="not-a-uuid")  # type: ignore[arg-type]


class TestLineCorrectionRequest:
    def test_required_fields_enforced(self) -> None:
        with pytest.raises(ValidationError):
            LineCorrectionRequest()  # type: ignore[call-arg]

    def test_optional_reason(self) -> None:
        req = LineCorrectionRequest(
            farm_id=uuid4(),
            line_item_id=uuid4(),
            new_canonical_product_id=uuid4(),
        )
        assert req.reason is None

    def test_reason_provided(self) -> None:
        req = LineCorrectionRequest(
            farm_id=uuid4(),
            line_item_id=uuid4(),
            new_canonical_product_id=uuid4(),
            reason="Wrong product matched",
        )
        assert req.reason == "Wrong product matched"


class TestCanonicalProductResponse:
    def test_boolean_and_nullable_fields(self) -> None:
        model = CanonicalProductResponse.model_validate({
            "id": uuid4(),
            "name": "Corn Seed",
            "category": "Seeds",
            "default_unit": "kg",
            "active": True,
        })
        assert model.active is True
        assert model.category == "Seeds"

    def test_nullable_category(self) -> None:
        model = CanonicalProductResponse.model_validate({
            "id": uuid4(),
            "name": "Generic Product",
            "category": None,
            "default_unit": None,
            "active": False,
        })
        assert model.category is None
        assert model.active is False


class TestDecimalSerialization:
    def test_decimal_fields_in_json(self) -> None:
        model = InvoiceResponse.model_validate(_invoice_attrs())
        json_str = model.model_dump_json()
        assert "1000.00" in json_str
        assert "190.00" in json_str


class TestEnumFieldsAsStrings:
    def test_status_accepted_as_string(self) -> None:
        attrs = _invoice_attrs()
        attrs["status"] = "processing"
        model = InvoiceResponse.model_validate(attrs)
        assert model.status == "processing"

    def test_document_source_type(self) -> None:
        doc = UploadedDocumentResponse.model_validate({
            "id": uuid4(),
            "farm_id": uuid4(),
            "source_type": "xml",
            "original_filename": "invoice.xml",
            "storage_path": "/uploads/invoice.xml",
            "file_size_bytes": 4096,
            "mime_type": "application/xml",
            "uploaded_at": _NOW,
        })
        assert doc.source_type == "xml"
