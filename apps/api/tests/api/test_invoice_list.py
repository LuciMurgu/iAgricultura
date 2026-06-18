"""Tests for invoice list view."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from farm_copilot.api.app import app
from farm_copilot.api.deps import get_db


def _mock_session_with_invoices(invoices: list, total: int, status_counts: dict):
    """Create a mock DB session that returns invoice list + counts."""
    session = AsyncMock()
    call_count = 0

    async def _execute(stmt):
        nonlocal call_count
        call_count += 1
        result = MagicMock()

        # Call 1: count query (total)
        # Call 2: data query (invoices)
        # Call 3: status count query
        # Call 4: alert count query
        if call_count == 1:
            result.scalar_one.return_value = total
        elif call_count == 2:
            scalars = MagicMock()
            scalars.all.return_value = invoices
            result.scalars.return_value = scalars
        elif call_count == 3:
            result.all.return_value = [
                (k, v) for k, v in status_counts.items()
            ]
        elif call_count == 4:
            result.all.return_value = []  # no alerts
        return result

    session.execute = _execute
    return session


class TestInvoiceList:
    """Invoice list route tests."""

    @pytest.mark.asyncio
    async def test_invoices_not_logged_in_redirects(self) -> None:
        """GET /invoices without auth redirects to /login."""
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            follow_redirects=False,
        ) as client:
            response = await client.get("/invoices")

        assert response.status_code == 302
        assert "/login" in response.headers["location"]

    @pytest.mark.asyncio
    async def test_invoices_empty_state(self) -> None:
        """GET /invoices with empty farm shows empty state."""
        session = _mock_session_with_invoices([], 0, {})

        async def mock_db():
            yield session

        app.dependency_overrides[get_db] = mock_db
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(
                transport=transport,
                base_url="http://test",
                cookies=_make_session_cookie(),
            ) as client:
                response = await client.get("/invoices")

            assert response.status_code == 200
            assert "No invoices yet" in response.text
        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    async def test_invoices_with_status_filter(self) -> None:
        """GET /invoices?status=needs_review passes status to template."""
        session = _mock_session_with_invoices(
            [], 0, {"needs_review": 2, "completed": 5}
        )

        async def mock_db():
            yield session

        app.dependency_overrides[get_db] = mock_db
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(
                transport=transport,
                base_url="http://test",
                cookies=_make_session_cookie(),
            ) as client:
                response = await client.get("/invoices?status=needs_review")

            assert response.status_code == 200
        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    async def test_invoices_page_param(self) -> None:
        """GET /invoices?page=2 renders without error."""
        session = _mock_session_with_invoices([], 0, {})

        async def mock_db():
            yield session

        app.dependency_overrides[get_db] = mock_db
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(
                transport=transport,
                base_url="http://test",
                cookies=_make_session_cookie(),
            ) as client:
                response = await client.get("/invoices?page=2")

            assert response.status_code == 200
        finally:
            app.dependency_overrides.pop(get_db, None)


def _make_session_cookie() -> dict:
    """Create a signed session cookie with fake user/farm ID."""
    import base64
    import json
    from uuid import uuid4

    from itsdangerous import TimestampSigner

    from farm_copilot.api.deps import app_settings

    data = {
        "user_id": str(uuid4()),
        "farm_id": str(uuid4()),
        "user_name": "Test Farmer",
        "farm_name": "Test Farm",
    }
    payload = base64.b64encode(json.dumps(data).encode()).decode()
    signer = TimestampSigner(app_settings.session_secret_key)
    signed = signer.sign(payload).decode()
    return {"session": signed}
