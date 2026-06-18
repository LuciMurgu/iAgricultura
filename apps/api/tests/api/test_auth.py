"""Tests for auth — password hashing, route rendering, auth flow."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from farm_copilot.api.app import app
from farm_copilot.api.auth import hash_password, verify_password


class TestPasswordHashing:
    """Password hashing round-trip tests."""

    def test_hash_and_verify(self) -> None:
        """hash_password + verify_password round-trip works."""
        pw = "SecureP@ss123"
        hashed = hash_password(pw)
        assert hashed != pw
        assert verify_password(pw, hashed)

    def test_wrong_password(self) -> None:
        """verify_password returns False for wrong password."""
        hashed = hash_password("correct")
        assert not verify_password("wrong", hashed)

    def test_hash_is_unique(self) -> None:
        """Each hash_password call produces a different hash (salt)."""
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2


class TestAuthRoutes:
    """Auth route rendering tests."""

    @pytest.mark.asyncio
    async def test_get_login(self) -> None:
        """GET /login returns 200 with login form."""
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            response = await client.get("/login")

        assert response.status_code == 200
        assert "Login" in response.text

    @pytest.mark.asyncio
    async def test_get_register(self) -> None:
        """GET /register returns 200 with register form."""
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            response = await client.get("/register")

        assert response.status_code == 200
        assert "Create Account" in response.text

    @pytest.mark.asyncio
    async def test_protected_route_redirects_to_login(self) -> None:
        """Accessing /dashboard without session redirects to /login."""
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
    async def test_upload_redirects_to_login(self) -> None:
        """Accessing /upload without session redirects to /login."""
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            follow_redirects=False,
        ) as client:
            response = await client.get("/upload")

        assert response.status_code == 302
        assert "/login" in response.headers["location"]

    @pytest.mark.asyncio
    async def test_health_is_public(self) -> None:
        """GET /health is accessible without auth."""
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            response = await client.get("/health")

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_root_redirects_to_login(self) -> None:
        """GET / without session redirects to /login."""
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            follow_redirects=False,
        ) as client:
            response = await client.get("/")

        assert response.status_code == 302
        assert "/login" in response.headers["location"]

    @pytest.mark.asyncio
    async def test_login_wrong_credentials(self) -> None:
        """POST /login with invalid credentials shows error."""
        from unittest.mock import AsyncMock, MagicMock

        from farm_copilot.api.deps import get_db

        async def mock_db():
            session = AsyncMock()
            # get_user_by_email does: result = await session.execute(...)
            # then calls result.scalar_one_or_none() (sync call)
            # Use MagicMock for result so .scalar_one_or_none() returns None
            result = MagicMock()
            result.scalar_one_or_none.return_value = None
            session.execute.return_value = result
            yield session

        app.dependency_overrides[get_db] = mock_db
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(
                transport=transport, base_url="http://test"
            ) as client:
                response = await client.post(
                    "/login",
                    data={"email": "bad@test.com", "password": "wrong"},
                )

            assert response.status_code == 400
            assert "Invalid email or password" in response.text
        finally:
            app.dependency_overrides.pop(get_db, None)
