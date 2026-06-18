"""Tests for /api/v1 layer — response models, auth dependency, CORS, middleware.

Pure-logic tests — no database required.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import uuid4

import pytest

from farm_copilot.contracts.api_v1_models import (
    AlertDetail,
    AlertListItem,
    AlertListResponse,
    AnafStatusResponse,
    AnafSyncResponse,
    BulkExportRequest,
    CorrectLineRequest,
    CorrectLineResponse,
    DashboardFeedItem,
    DashboardFeedResponse,
    InvoiceDetailResponse,
    InvoiceLineItemDetail,
    InvoiceListItem,
    InvoiceListResponse,
    LoginRequest,
    LoginResponse,
    OkResponse,
    ReprocessResponse,
    StockBalanceItem,
    StockDetailResponse,
    StockListResponse,
    StockMovementItem,
    UserResponse,
)

# ---------------------------------------------------------------------------
# 1. Response model serialization
# ---------------------------------------------------------------------------


class TestOkResponse:
    def test_default(self) -> None:
        r = OkResponse()
        assert r.ok is True
        assert r.model_dump() == {"ok": True}


class TestLoginModels:
    def test_login_request(self) -> None:
        req = LoginRequest(email="test@test.com", password="pass")
        assert req.email == "test@test.com"

    def test_login_response(self) -> None:
        uid = uuid4()
        fid = uuid4()
        resp = LoginResponse(
            user=UserResponse(
                id=uid, email="a@b.com", name="Ion",
                farm_id=fid, farm_name="Ferma Test",
            ),
        )
        d = resp.model_dump()
        assert d["user"]["email"] == "a@b.com"
        assert d["user"]["farm_name"] == "Ferma Test"

    def test_user_response_serializes_uuid(self) -> None:
        uid = uuid4()
        user = UserResponse(
            id=uid, email="x@y.com", name="X",
            farm_id=uid, farm_name="F",
        )
        d = user.model_dump(mode="json")
        assert isinstance(d["id"], str)


class TestDashboardModels:
    def test_feed_item(self) -> None:
        item = DashboardFeedItem(
            priority=1, icon="🚨", title="Alert",
            detail="Detail", action_url="/test",
            action_label="Go", category="alert",
        )
        assert item.priority == 1

    def test_feed_response_empty(self) -> None:
        resp = DashboardFeedResponse(
            farm_name="F", user_name="U",
            total_invoices=0, invoices_needing_review=0,
            unresolved_alerts=0, anaf_connected=False,
            anaf_last_sync=None, items=[],
        )
        assert resp.total_invoices == 0
        assert resp.items == []


class TestInvoiceModels:
    def test_list_item(self) -> None:
        item = InvoiceListItem(
            id=uuid4(), status="uploaded",
            invoice_number="FC-001",
            invoice_date=date(2026, 1, 1),
            currency="RON", total_amount=Decimal("1000"),
            alert_count=2, created_at=datetime.now(),
        )
        assert item.alert_count == 2

    def test_list_response_pagination(self) -> None:
        resp = InvoiceListResponse(
            items=[], total=0, page=1, pages=1,
            status_counts={"uploaded": 0},
        )
        assert resp.pages == 1

    def test_line_item_detail(self) -> None:
        li = InvoiceLineItemDetail(
            id=uuid4(), line_order=1,
            raw_description="Test", quantity=Decimal("10"),
            unit="kg", unit_price=Decimal("5"),
            line_total=Decimal("50"),
            tax_rate=None, tax_amount=None,
            line_classification="stockable_input",
            canonical_product_id=None,
            normalization_confidence=None,
            normalization_method=None,
        )
        assert li.line_classification == "stockable_input"

    def test_alert_detail(self) -> None:
        a = AlertDetail(
            id=uuid4(), alert_key="overpay",
            severity="warning", subject_type="line",
            subject_id="abc",
            reason_codes=["price_deviation"],
            evidence={"deviation": "0.35"},
            confidence=Decimal("0.85"),
            recommended_action="Review price",
            created_at=datetime.now(),
        )
        assert a.severity == "warning"

    def test_invoice_detail_response(self) -> None:
        resp = InvoiceDetailResponse(
            id=uuid4(), farm_id=uuid4(), status="uploaded",
            invoice_number=None, invoice_date=None,
            due_date=None, currency="RON",
            subtotal_amount=None, tax_amount=None,
            total_amount=None, extraction_method=None,
            created_at=datetime.now(), updated_at=datetime.now(),
            line_items=[], alerts=[], explanations=[],
        )
        assert resp.status == "uploaded"
        assert resp.line_items == []

    def test_reprocess_response(self) -> None:
        r = ReprocessResponse(ok=True, new_status="validated")
        assert r.new_status == "validated"

    def test_correct_line_request(self) -> None:
        req = CorrectLineRequest(
            line_item_id=uuid4(),
            canonical_product_id=uuid4(),
            reason="Manual fix",
        )
        assert req.reason == "Manual fix"

    def test_correct_line_response(self) -> None:
        lid = uuid4()
        pid = uuid4()
        r = CorrectLineResponse(
            ok=True, line_item_id=lid,
            new_canonical_product_id=pid,
        )
        assert r.line_item_id == lid


class TestStockModels:
    def test_balance_item(self) -> None:
        item = StockBalanceItem(
            product_id=uuid4(), product_name="Azotat",
            category="fertilizer", unit="kg",
            total_in=Decimal("1000"), total_out=Decimal("200"),
            balance=Decimal("800"), last_movement_at=None,
        )
        assert item.balance == Decimal("800")

    def test_stock_list(self) -> None:
        resp = StockListResponse(items=[], total_products=0)
        assert resp.total_products == 0

    def test_movement_item(self) -> None:
        m = StockMovementItem(
            id=uuid4(), direction="in",
            quantity=Decimal("100"), unit="kg",
            effective_at=datetime.now(),
            invoice_id=None, notes=None,
        )
        assert m.direction == "in"

    def test_stock_detail(self) -> None:
        resp = StockDetailResponse(
            product_id=uuid4(), product_name="X",
            category=None, default_unit="kg",
            movements=[],
        )
        assert resp.movements == []


class TestAnafModels:
    def test_status_disconnected(self) -> None:
        r = AnafStatusResponse(connected=False)
        assert r.token_valid is False
        assert r.cif is None

    def test_status_connected(self) -> None:
        r = AnafStatusResponse(
            connected=True, cif="12345678",
            token_valid=True,
            refresh_days_remaining=60,
            sync_enabled=True,
            sync_interval_hours=4,
        )
        assert r.cif == "12345678"

    def test_sync_response(self) -> None:
        r = AnafSyncResponse(
            ok=True, invoices_created=5,
            duplicates_skipped=2, errors=0,
        )
        assert r.invoices_created == 5


class TestAlertModels:
    def test_alert_list_item(self) -> None:
        a = AlertListItem(
            id=uuid4(), invoice_id=uuid4(),
            alert_key="duplicate", severity="critical",
            subject_type="invoice", subject_id="abc",
            reason_codes=["same_number"],
            confidence=Decimal("0.99"),
            recommended_action="Review",
            created_at=datetime.now(),
        )
        assert a.severity == "critical"

    def test_alert_list_response(self) -> None:
        r = AlertListResponse(items=[], total=0)
        assert r.total == 0


class TestBulkExportRequest:
    def test_with_ids(self) -> None:
        ids = [uuid4(), uuid4()]
        req = BulkExportRequest(invoice_ids=ids)
        assert len(req.invoice_ids) == 2

    def test_empty(self) -> None:
        req = BulkExportRequest(invoice_ids=[])
        assert req.invoice_ids == []


# ---------------------------------------------------------------------------
# 2. Auth dependency config
# ---------------------------------------------------------------------------


class TestApiAuthDependency:
    def test_api_user_fields(self) -> None:
        from farm_copilot.api.deps import ApiUser

        uid = uuid4()
        fid = uuid4()
        user = ApiUser(
            user_id=uid, farm_id=fid,
            farm_name="Test", user_name="Ion",
        )
        assert user.user_id == uid
        assert user.farm_id == fid
        assert user.farm_name == "Test"

    def test_api_user_frozen(self) -> None:
        from farm_copilot.api.deps import ApiUser

        user = ApiUser(
            user_id=uuid4(), farm_id=uuid4(),
            farm_name="F", user_name="U",
        )
        with pytest.raises(AttributeError):
            user.user_name = "changed"  # type: ignore[misc]


# ---------------------------------------------------------------------------
# 3. Middleware config (PUBLIC_PREFIXES includes /api/v1)
# ---------------------------------------------------------------------------


class TestMiddlewareApiV1:
    def test_api_v1_is_public_prefix(self) -> None:
        from farm_copilot.api.middleware import AuthRedirectMiddleware

        assert "/api/v1" in AuthRedirectMiddleware.PUBLIC_PREFIXES

    def test_api_v1_auth_login_is_public(self) -> None:
        from farm_copilot.api.middleware import AuthRedirectMiddleware

        path = "/api/v1/auth/login"
        is_public = any(
            path.startswith(p) for p in AuthRedirectMiddleware.PUBLIC_PREFIXES
        )
        assert is_public

    def test_api_v1_invoices_is_public_prefix(self) -> None:
        """API routes bypass HTML middleware — auth is handled by the API dependency."""
        from farm_copilot.api.middleware import AuthRedirectMiddleware

        path = "/api/v1/invoices"
        is_public = any(
            path.startswith(p) for p in AuthRedirectMiddleware.PUBLIC_PREFIXES
        )
        assert is_public


# ---------------------------------------------------------------------------
# 4. CORS config
# ---------------------------------------------------------------------------


class TestCorsConfig:
    def test_app_has_cors_middleware(self) -> None:
        from farm_copilot.api.app import create_app

        app = create_app()
        cors_found = any(
            getattr(m, "cls", None).__name__ == "CORSMiddleware"
            for m in app.user_middleware
            if hasattr(getattr(m, "cls", None), "__name__")
        )
        assert cors_found

    def test_api_v1_router_mounted(self) -> None:
        from farm_copilot.api.app import create_app

        app = create_app()
        routes = [r.path for r in app.routes if hasattr(r, "path")]
        # At least one /api/v1 route exists
        has_api = any("/api/v1" in r for r in routes)
        assert has_api
