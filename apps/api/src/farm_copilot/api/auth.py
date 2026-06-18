"""Authentication utilities — password hashing + session helpers."""

from __future__ import annotations

from uuid import UUID

import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.database.models import Farm, FarmMembership, User


def hash_password(password: str) -> str:
    """Hash a password with bcrypt.

    bcrypt truncates at 72 bytes — we do it explicitly to prevent
    ValueError on newer bcrypt versions.
    """
    pw_bytes = password.encode()[:72]
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against a bcrypt hash."""
    pw_bytes = password.encode()[:72]
    return bcrypt.checkpw(pw_bytes, password_hash.encode())


async def get_user_by_email(
    session: AsyncSession,
    *,
    email: str,
) -> User | None:
    """Fetch a user by email address."""
    result = await session.execute(
        select(User).where(User.email == email.lower().strip())
    )
    return result.scalar_one_or_none()


async def get_user_by_id(
    session: AsyncSession,
    *,
    user_id: UUID,
) -> User | None:
    """Fetch a user by ID."""
    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalar_one_or_none()


async def create_user(
    session: AsyncSession,
    *,
    email: str,
    password: str,
    name: str,
) -> User:
    """Create a new user with hashed password."""
    user = User(
        email=email.lower().strip(),
        password_hash=hash_password(password),
        name=name.strip(),
    )
    session.add(user)
    await session.flush()
    return user


async def create_farm_with_owner(
    session: AsyncSession,
    *,
    user_id: UUID,
    farm_name: str,
) -> Farm:
    """Create a farm and make the user its owner."""
    farm = Farm(name=farm_name.strip())
    session.add(farm)
    await session.flush()

    membership = FarmMembership(
        user_id=user_id,
        farm_id=farm.id,
        role="owner",
    )
    session.add(membership)
    await session.flush()
    return farm


async def get_user_farms(
    session: AsyncSession,
    *,
    user_id: UUID,
) -> list[tuple[Farm, FarmMembership]]:
    """Get all farms a user belongs to, with their role."""
    result = await session.execute(
        select(Farm, FarmMembership)
        .join(FarmMembership, Farm.id == FarmMembership.farm_id)
        .where(FarmMembership.user_id == user_id)
    )
    return list(result.all())


async def get_user_farm_role(
    session: AsyncSession,
    *,
    user_id: UUID,
    farm_id: UUID,
) -> str | None:
    """Get the user's role for a specific farm.

    Returns None if no membership.
    """
    result = await session.execute(
        select(FarmMembership.role).where(
            FarmMembership.user_id == user_id,
            FarmMembership.farm_id == farm_id,
        )
    )
    row = result.scalar_one_or_none()
    return row.value if row else None
