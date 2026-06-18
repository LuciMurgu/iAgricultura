"""Tests for stock overview and detail routes."""

from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from farm_copilot.api.app import app
from farm_copilot.database.stock_movements import StockBalance


class TestStockBalance:
    """StockBalance dataclass unit tests."""

    def test_balance_computed_correctly(self) -> None:
        """balance = total_in - total_out."""
        sb = StockBalance(
            canonical_product_id=uuid4(),
            product_name="Test",
            category=None,
            unit="KGM",
            total_in=Decimal("100.0000"),
            total_out=Decimal("30.0000"),
            last_movement_at=None,
        )
        assert sb.balance == Decimal("70.0000")

    def test_balance_negative(self) -> None:
        """balance can be negative if out > in."""
        sb = StockBalance(
            canonical_product_id=uuid4(),
            product_name="Test",
            category="Feed",
            unit="KGM",
            total_in=Decimal("10"),
            total_out=Decimal("25"),
            last_movement_at=None,
        )
        assert sb.balance == Decimal("-15")

    def test_balance_zero(self) -> None:
        """balance is zero when in == out."""
        sb = StockBalance(
            canonical_product_id=uuid4(),
            product_name="Test",
            category=None,
            unit="LTR",
            total_in=Decimal("50"),
            total_out=Decimal("50"),
            last_movement_at=None,
        )
        assert sb.balance == Decimal("0")


class TestStockRoutes:
    """Stock route tests."""

    @pytest.mark.asyncio
    async def test_stock_not_logged_in_redirects(self) -> None:
        """GET /stock without auth redirects to /login."""
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            follow_redirects=False,
        ) as client:
            response = await client.get("/stock")

        assert response.status_code == 302
        assert "/login" in response.headers["location"]

    @pytest.mark.asyncio
    async def test_stock_detail_not_logged_in_redirects(self) -> None:
        """GET /stock/{id} without auth redirects to /login."""
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            follow_redirects=False,
        ) as client:
            response = await client.get(f"/stock/{uuid4()}")

        assert response.status_code == 302
        assert "/login" in response.headers["location"]

    @pytest.mark.asyncio
    async def test_stock_empty_state(self) -> None:
        """GET /stock with no movements shows empty state."""
        import base64
        import json
        from unittest.mock import AsyncMock, MagicMock

        from itsdangerous import TimestampSigner

        from farm_copilot.api.deps import app_settings, get_db

        async def mock_db():
            session = AsyncMock()
            result = MagicMock()
            result.all.return_value = []  # no balances
            session.execute.return_value = result
            yield session

        app.dependency_overrides[get_db] = mock_db

        data = {
            "user_id": str(uuid4()),
            "farm_id": str(uuid4()),
            "user_name": "Test",
            "farm_name": "Test Farm",
        }
        payload = base64.b64encode(json.dumps(data).encode()).decode()
        signer = TimestampSigner(app_settings.session_secret_key)
        signed = signer.sign(payload).decode()

        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(
                transport=transport,
                base_url="http://test",
                cookies={"session": signed},
            ) as client:
                response = await client.get("/stock")

            assert response.status_code == 200
            assert "No stock movements recorded yet" in response.text
        finally:
            app.dependency_overrides.pop(get_db, None)
