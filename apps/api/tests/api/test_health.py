"""Tests for the health check endpoint."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from farm_copilot.api.app import app
from farm_copilot.api.deps import get_db


@pytest.mark.asyncio
async def test_health_check_healthy() -> None:
    """GET /health returns 200 with status=healthy when DB is ok."""

    async def mock_db():
        session = AsyncMock()
        result = AsyncMock()
        session.execute.return_value = result
        yield session

    app.dependency_overrides[get_db] = mock_db
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            response = await client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_health_check_unhealthy() -> None:
    """GET /health returns unhealthy when DB execute raises."""

    async def broken_db():
        session = AsyncMock()
        session.execute = AsyncMock(
            side_effect=ConnectionError("DB down")
        )
        yield session

    app.dependency_overrides[get_db] = broken_db
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            response = await client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "unhealthy"
        assert "DB down" in data["database"]
    finally:
        app.dependency_overrides.pop(get_db, None)
