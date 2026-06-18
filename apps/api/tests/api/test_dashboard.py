"""Tests for dashboard action feed."""

from __future__ import annotations

import pytest

from farm_copilot.api.dashboard import _MAX_ACTION_ITEMS, ActionItem, DashboardData


class TestActionItemSorting:
    """Action item priority sorting tests."""

    def test_items_sorted_by_priority(self) -> None:
        """Lower priority number comes first."""
        items = [
            ActionItem(3, "📥", "Info", "", "/", "Go", "sync"),
            ActionItem(1, "🚨", "Critical", "", "/", "Go", "alert"),
            ActionItem(2, "⚠️", "Warning", "", "/", "Go", "alert"),
        ]
        items.sort(key=lambda x: x.priority)
        assert items[0].priority == 1
        assert items[1].priority == 2
        assert items[2].priority == 3

    def test_max_5_items_enforced(self) -> None:
        """More than 5 items are truncated to 5."""
        items = [
            ActionItem(i % 3 + 1, "📋", f"Item {i}", "", "/", "Go", "review")
            for i in range(10)
        ]
        items.sort(key=lambda x: x.priority)
        truncated = items[:_MAX_ACTION_ITEMS]
        assert len(truncated) == 5


class TestDashboardData:
    """DashboardData defaults and construction."""

    def test_defaults(self) -> None:
        """DashboardData has sensible defaults."""
        data = DashboardData(
            farm_name="Test Farm",
            user_name="Test User",
            farm_id="123",
        )
        assert data.total_invoices == 0
        assert data.invoices_needing_review == 0
        assert data.unresolved_alerts == 0
        assert data.anaf_connected is False
        assert data.action_items == []
        assert data.anaf_token_warning is None

    def test_action_items_mutable(self) -> None:
        """Each instance gets its own action_items list."""
        d1 = DashboardData(farm_name="F1", user_name="U1", farm_id="1")
        d2 = DashboardData(farm_name="F2", user_name="U2", farm_id="2")
        d1.action_items.append(
            ActionItem(1, "🚨", "Alert", "", "/", "Go", "alert")
        )
        assert len(d2.action_items) == 0


class TestDashboardRoute:
    """Dashboard route tests."""

    @pytest.mark.asyncio
    async def test_dashboard_not_logged_in_redirects(self) -> None:
        """GET /dashboard without auth redirects to /login."""
        from httpx import ASGITransport, AsyncClient

        from farm_copilot.api.app import app

        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            follow_redirects=False,
        ) as client:
            response = await client.get("/dashboard")

        assert response.status_code == 302
        assert "/login" in response.headers["location"]

    @pytest.mark.asyncio
    async def test_dashboard_logged_in_renders(self) -> None:
        """GET /dashboard with session returns 200 with farm name."""
        import base64
        import json
        from unittest.mock import AsyncMock, MagicMock
        from uuid import uuid4

        from httpx import ASGITransport, AsyncClient
        from itsdangerous import TimestampSigner

        from farm_copilot.api.app import app
        from farm_copilot.api.deps import app_settings, get_db

        # Mock DB to return zero counts for all queries
        call_count = 0

        async def mock_db():
            nonlocal call_count
            session = AsyncMock()

            async def _execute(stmt):
                nonlocal call_count
                call_count += 1
                result = MagicMock()
                # All count queries return 0, token query returns None
                result.scalar_one.return_value = 0
                result.scalar_one_or_none.return_value = None
                result.all.return_value = []
                return result

            session.execute = _execute
            yield session

        app.dependency_overrides[get_db] = mock_db

        data = {
            "user_id": str(uuid4()),
            "farm_id": str(uuid4()),
            "user_name": "Ion Popescu",
            "farm_name": "Ferma Test",
        }
        payload = base64.b64encode(json.dumps(data).encode()).decode()
        signer = TimestampSigner(app_settings.session_secret_key)
        signed = signer.sign(payload).decode()
        cookies = {"session": signed}

        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(
                transport=transport,
                base_url="http://test",
                cookies=cookies,
            ) as client:
                response = await client.get("/dashboard")

            assert response.status_code == 200
            assert "Ferma Test" in response.text
            assert "Ion Popescu" in response.text
        finally:
            app.dependency_overrides.pop(get_db, None)
