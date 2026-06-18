"""Tests for the background ANAF sync scheduler."""

from __future__ import annotations

import asyncio
from unittest.mock import patch

import pytest

from farm_copilot.worker.scheduler import (
    SchedulerSettings,
    start_scheduler,
    stop_scheduler,
)


class TestSchedulerSettings:
    """SchedulerSettings configuration tests."""

    def test_defaults(self) -> None:
        """Default settings: enabled, 4h interval, 60s delay."""
        settings = SchedulerSettings(
            _env_file=None,  # type: ignore[call-arg]
        )
        assert settings.anaf_sync_enabled is True
        assert settings.anaf_sync_interval_seconds == 14400
        assert settings.anaf_sync_initial_delay_seconds == 60

    def test_override_from_env(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Settings can be overridden via env vars."""
        monkeypatch.setenv("ANAF_SYNC_ENABLED", "false")
        monkeypatch.setenv("ANAF_SYNC_INTERVAL_SECONDS", "300")
        monkeypatch.setenv("ANAF_SYNC_INITIAL_DELAY_SECONDS", "5")

        settings = SchedulerSettings(_env_file=None)  # type: ignore[call-arg]
        assert settings.anaf_sync_enabled is False
        assert settings.anaf_sync_interval_seconds == 300
        assert settings.anaf_sync_initial_delay_seconds == 5

    def test_disabled(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """ANAF_SYNC_ENABLED=false disables the scheduler."""
        monkeypatch.setenv("ANAF_SYNC_ENABLED", "false")
        settings = SchedulerSettings(_env_file=None)  # type: ignore[call-arg]
        assert settings.anaf_sync_enabled is False

    def test_interval_hours_calculation(self) -> None:
        """Interval converts to hours correctly."""
        settings = SchedulerSettings(
            _env_file=None,  # type: ignore[call-arg]
        )
        assert settings.anaf_sync_interval_seconds // 3600 == 4


class TestSchedulerLifecycle:
    """Start/stop scheduler tests."""

    @pytest.mark.asyncio
    async def test_start_creates_task(self) -> None:
        """start_scheduler creates an asyncio task."""
        import farm_copilot.worker.scheduler as sched_mod

        # Patch scheduler_settings to disable (loop returns immediately)
        with patch.object(
            sched_mod, "scheduler_settings",
            SchedulerSettings(
                anaf_sync_enabled=False,
                _env_file=None,  # type: ignore[call-arg]
            ),
        ):
            start_scheduler()
            assert sched_mod._scheduler_task is not None

            # Let the event loop run so the task completes
            await asyncio.sleep(0.01)

            # Clean up
            await stop_scheduler()

    @pytest.mark.asyncio
    async def test_stop_cancels_task(self) -> None:
        """stop_scheduler cancels and clears _scheduler_task."""
        import farm_copilot.worker.scheduler as sched_mod

        with patch.object(
            sched_mod, "scheduler_settings",
            SchedulerSettings(
                anaf_sync_enabled=False,
                _env_file=None,  # type: ignore[call-arg]
            ),
        ):
            start_scheduler()
            await asyncio.sleep(0.01)
            await stop_scheduler()
            assert sched_mod._scheduler_task is None

    @pytest.mark.asyncio
    async def test_stop_when_no_task(self) -> None:
        """stop_scheduler is safe to call when no task is running."""
        import farm_copilot.worker.scheduler as sched_mod
        sched_mod._scheduler_task = None
        await stop_scheduler()
        assert sched_mod._scheduler_task is None
