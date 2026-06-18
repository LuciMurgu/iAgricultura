"""Tests for ANAF token needs_refresh logic.

These are unit tests that mock the DB layer to test the refresh
threshold calculation without requiring a database connection.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest


def _make_token(
    *,
    created_at: datetime,
    access_token_expires_at: datetime,
    last_refreshed_at: datetime | None = None,
) -> MagicMock:
    """Create a mock AnafToken with the specified timing fields."""
    token = MagicMock()
    token.created_at = created_at
    token.access_token_expires_at = access_token_expires_at
    token.last_refreshed_at = last_refreshed_at
    return token


class TestNeedsRefresh:
    """Tests for the 70% lifetime refresh threshold."""

    @pytest.mark.asyncio
    async def test_no_token_returns_none(self) -> None:
        """No token for farm → returns None."""
        with patch(
            "farm_copilot.database.anaf_tokens.get_anaf_token_by_farm",
            new_callable=AsyncMock,
            return_value=None,
        ):
            from farm_copilot.database.anaf_tokens import needs_refresh

            session = AsyncMock()
            result = await needs_refresh(session, farm_id=uuid4())
            assert result is None

    @pytest.mark.asyncio
    async def test_token_at_50_percent_no_refresh(self) -> None:
        """Token at 50% lifetime → no refresh needed."""
        now = datetime.now(tz=UTC)
        created = now - timedelta(hours=5)
        expires = now + timedelta(hours=5)  # 10h total, 5h elapsed = 50%

        token = _make_token(
            created_at=created,
            access_token_expires_at=expires,
        )

        with patch(
            "farm_copilot.database.anaf_tokens.get_anaf_token_by_farm",
            new_callable=AsyncMock,
            return_value=token,
        ):
            from farm_copilot.database.anaf_tokens import needs_refresh

            session = AsyncMock()
            result = await needs_refresh(session, farm_id=uuid4())
            assert result is False

    @pytest.mark.asyncio
    async def test_token_at_75_percent_needs_refresh(self) -> None:
        """Token at 75% lifetime → refresh needed."""
        now = datetime.now(tz=UTC)
        created = now - timedelta(hours=15)
        expires = now + timedelta(hours=5)  # 20h total, 15h elapsed = 75%

        token = _make_token(
            created_at=created,
            access_token_expires_at=expires,
        )

        with patch(
            "farm_copilot.database.anaf_tokens.get_anaf_token_by_farm",
            new_callable=AsyncMock,
            return_value=token,
        ):
            from farm_copilot.database.anaf_tokens import needs_refresh

            session = AsyncMock()
            result = await needs_refresh(session, farm_id=uuid4())
            assert result is True

    @pytest.mark.asyncio
    async def test_token_at_100_percent_needs_refresh(self) -> None:
        """Token at 100% lifetime (expired) → refresh needed."""
        now = datetime.now(tz=UTC)
        created = now - timedelta(hours=10)
        expires = now - timedelta(hours=1)  # already expired

        token = _make_token(
            created_at=created,
            access_token_expires_at=expires,
        )

        with patch(
            "farm_copilot.database.anaf_tokens.get_anaf_token_by_farm",
            new_callable=AsyncMock,
            return_value=token,
        ):
            from farm_copilot.database.anaf_tokens import needs_refresh

            session = AsyncMock()
            result = await needs_refresh(session, farm_id=uuid4())
            assert result is True

    @pytest.mark.asyncio
    async def test_token_just_created_no_refresh(self) -> None:
        """Token just created → no refresh needed."""
        now = datetime.now(tz=UTC)
        created = now - timedelta(seconds=30)
        expires = now + timedelta(hours=1)  # plenty of time left

        token = _make_token(
            created_at=created,
            access_token_expires_at=expires,
        )

        with patch(
            "farm_copilot.database.anaf_tokens.get_anaf_token_by_farm",
            new_callable=AsyncMock,
            return_value=token,
        ):
            from farm_copilot.database.anaf_tokens import needs_refresh

            session = AsyncMock()
            result = await needs_refresh(session, farm_id=uuid4())
            assert result is False

    @pytest.mark.asyncio
    async def test_uses_last_refreshed_at_when_available(self) -> None:
        """When last_refreshed_at is set, use it instead of created_at."""
        now = datetime.now(tz=UTC)
        # Created long ago but refreshed recently
        created = now - timedelta(days=30)
        refreshed = now - timedelta(minutes=5)
        expires = now + timedelta(hours=1)

        token = _make_token(
            created_at=created,
            access_token_expires_at=expires,
            last_refreshed_at=refreshed,
        )

        with patch(
            "farm_copilot.database.anaf_tokens.get_anaf_token_by_farm",
            new_callable=AsyncMock,
            return_value=token,
        ):
            from farm_copilot.database.anaf_tokens import needs_refresh

            session = AsyncMock()
            result = await needs_refresh(session, farm_id=uuid4())
            # 5min elapsed out of ~65min total = ~7.7% → no refresh
            assert result is False
