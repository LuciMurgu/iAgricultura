"""Seed a demo account so the showcase login works out of the box.

Idempotent: if a user with the demo email already exists, nothing changes.
Credentials are read from the environment with safe demo defaults:

    DEMO_SEED_ENABLED   (default "true")  — set "false" to skip seeding
    DEMO_USER_EMAIL     (default "demo@iagricultura.ro")
    DEMO_USER_PASSWORD  (default "demo1234")
    DEMO_USER_NAME      (default "Cont Demo")
    DEMO_FARM_NAME      (default "Ferma Demo")

This is intended for the demo/showcase deployment. For a real-data launch,
disable it (DEMO_SEED_ENABLED=false) and provision real accounts.
"""

from __future__ import annotations

import logging
import os

from farm_copilot.api.auth import create_farm_with_owner, create_user, get_user_by_email
from farm_copilot.database.session import async_session

logger = logging.getLogger(__name__)

DEMO_USER_EMAIL = os.getenv("DEMO_USER_EMAIL", "demo@iagricultura.ro")
DEMO_USER_PASSWORD = os.getenv("DEMO_USER_PASSWORD", "demo1234")
DEMO_USER_NAME = os.getenv("DEMO_USER_NAME", "Cont Demo")
DEMO_FARM_NAME = os.getenv("DEMO_FARM_NAME", "Ferma Demo")


def demo_seed_enabled() -> bool:
    return os.getenv("DEMO_SEED_ENABLED", "true").strip().lower() in {"1", "true", "yes"}


async def seed_demo_account() -> None:
    """Create the demo user + farm if they do not already exist."""
    if not demo_seed_enabled():
        logger.info("Demo seeding disabled (DEMO_SEED_ENABLED=false) — skipping")
        return

    async with async_session() as session, session.begin():
        existing = await get_user_by_email(session, email=DEMO_USER_EMAIL)
        if existing is not None:
            logger.info("Demo account already exists — skipping seed")
            return

        user = await create_user(
            session,
            email=DEMO_USER_EMAIL,
            password=DEMO_USER_PASSWORD,
            name=DEMO_USER_NAME,
        )
        await create_farm_with_owner(
            session,
            user_id=user.id,
            farm_name=DEMO_FARM_NAME,
        )
        logger.info("Seeded demo account: %s (farm: %s)", DEMO_USER_EMAIL, DEMO_FARM_NAME)
