"""Tests for ANAF API routes.

Uses httpx.AsyncClient with ASGITransport to test route handlers
without real HTTP calls or database connections.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from itsdangerous import TimestampSigner

from farm_copilot.api.app import app
from farm_copilot.api.deps import app_settings


def _make_session_cookie(data: dict) -> dict:
    """Create a signed session cookie for test requests."""
    import base64
    import json

    payload = base64.b64encode(json.dumps(data).encode()).decode()
    signer = TimestampSigner(app_settings.session_secret_key)
    signed = signer.sign(payload).decode()
    return {"session": signed}


@pytest.fixture
def _mock_db():
    """Mock the database dependency."""
    mock_session = AsyncMock()
    mock_session.commit = AsyncMock()
    mock_session.begin = MagicMock()

    async def _get_db():
        yield mock_session

    app.dependency_overrides = {}
    from farm_copilot.api.deps import get_db

    app.dependency_overrides[get_db] = _get_db
    yield mock_session
    app.dependency_overrides = {}


_FAKE_USER_ID = str(uuid4())
_FAKE_FARM_ID = str(uuid4())


class TestAnafRoutes:
    """ANAF route handler tests."""

    @pytest.mark.asyncio
    async def test_status_no_token_renders_not_connected(
        self, _mock_db: AsyncMock
    ) -> None:
        """GET /anaf/status — no token → 200 with 'Not Connected'."""
        farm_id = uuid4()

        with patch(
            "farm_copilot.api.routes.anaf.get_anaf_token_by_farm",
            new_callable=AsyncMock,
            return_value=None,
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.get(
                    f"/anaf/status/{farm_id}"
                )

            assert response.status_code == 200
            assert "Not Connected" in response.text

    @pytest.mark.asyncio
    async def test_authorize_missing_cif_redirects_with_error(
        self, _mock_db: AsyncMock
    ) -> None:
        """GET /anaf/authorize — empty CIF → redirect with error."""
        farm_id = uuid4()

        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
            follow_redirects=False,
        ) as client:
            response = await client.get(
                f"/anaf/authorize/{farm_id}?cif="
            )

        assert response.status_code == 303
        assert "CIF" in response.headers.get("location", "")

    @pytest.mark.asyncio
    async def test_authorize_valid_redirects_to_anaf(
        self, _mock_db: AsyncMock
    ) -> None:
        """GET /anaf/authorize — valid CIF → redirect to ANAF URL."""
        farm_id = uuid4()

        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
            follow_redirects=False,
        ) as client:
            response = await client.get(
                f"/anaf/authorize/{farm_id}?cif=RO12345678"
            )

        assert response.status_code == 302
        location = response.headers.get("location", "")
        assert "logincert.anaf.ro" in location
        assert "response_type=code" in location
        assert "state=" in location

    @pytest.mark.asyncio
    async def test_disconnect_no_token_redirects_gracefully(
        self, _mock_db: AsyncMock
    ) -> None:
        """POST /anaf/disconnect — no token → still redirects."""
        farm_id = uuid4()

        with patch(
            "farm_copilot.api.routes.anaf.delete_anaf_token",
            new_callable=AsyncMock,
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
                follow_redirects=False,
            ) as client:
                response = await client.post(
                    f"/anaf/disconnect/{farm_id}"
                )

            assert response.status_code == 303
            location = response.headers.get("location", "")
            assert f"/anaf/status/{farm_id}" in location
            assert "Disconnected" in location

    @pytest.mark.asyncio
    async def test_callback_invalid_state_redirects_with_error(
        self, _mock_db: AsyncMock
    ) -> None:
        """GET /anaf/callback — invalid state → redirect with error."""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
            follow_redirects=False,
        ) as client:
            response = await client.get(
                "/anaf/callback?code=test&state=invalid_state"
            )

        assert response.status_code == 303
        location = response.headers.get("location", "")
        assert "Invalid" in location

    def test_authorize_url_contains_client_id(self) -> None:
        """build_authorize_url includes client_id in URL."""
        client = __import__(
            "farm_copilot.worker.anaf_client", fromlist=["AnafClient"]
        ).AnafClient()
        url = client.build_authorize_url(
            client_id="test_client_123",
            redirect_uri="http://localhost/cb",
        )
        assert "client_id=test_client_123" in url
        assert "response_type=code" in url
