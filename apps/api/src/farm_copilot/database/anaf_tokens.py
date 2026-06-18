"""ANAF token CRUD — encrypted storage, upsert, refresh, delete.

All functions accept an AsyncSession and operate on the anaf_tokens table.
Sensitive fields (client_secret, access_token, refresh_token) are encrypted
at rest using Fernet symmetric encryption.
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import delete, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from .encryption import decrypt_token, encrypt_token
from .models import AnafToken


async def upsert_anaf_token(
    session: AsyncSession,
    *,
    farm_id: UUID,
    cif: str,
    client_id: str,
    client_secret: str,
    access_token: str,
    refresh_token: str,
    family_param: str | None,
    access_token_expires_at: datetime,
    refresh_token_expires_at: datetime,
) -> AnafToken:
    """Insert or update ANAF tokens for a farm.

    Encrypts secrets before storage. Uses ON CONFLICT on farm_id to upsert.
    """
    encrypted_secret = encrypt_token(client_secret)
    encrypted_access = encrypt_token(access_token)
    encrypted_refresh = encrypt_token(refresh_token)

    values = {
        "farm_id": farm_id,
        "cif": cif,
        "client_id": client_id,
        "client_secret_encrypted": encrypted_secret,
        "access_token_encrypted": encrypted_access,
        "refresh_token_encrypted": encrypted_refresh,
        "family_param": family_param,
        "access_token_expires_at": access_token_expires_at,
        "refresh_token_expires_at": refresh_token_expires_at,
    }

    update_values = {
        "cif": cif,
        "client_id": client_id,
        "client_secret_encrypted": encrypted_secret,
        "access_token_encrypted": encrypted_access,
        "refresh_token_encrypted": encrypted_refresh,
        "family_param": family_param,
        "access_token_expires_at": access_token_expires_at,
        "refresh_token_expires_at": refresh_token_expires_at,
        "updated_at": datetime.now(tz=UTC),
    }

    stmt = (
        pg_insert(AnafToken)
        .values(**values)
        .on_conflict_do_update(
            constraint="uq_anaf_tokens_farm_id",
            set_=update_values,
        )
        .returning(AnafToken)
    )

    result = await session.execute(stmt)
    token = result.scalar_one()
    await session.flush()
    return token


async def get_anaf_token_by_farm(
    session: AsyncSession,
    *,
    farm_id: UUID,
) -> AnafToken | None:
    """Fetch ANAF token record for a farm.

    Does NOT decrypt — caller must use ``decrypt_token()`` on encrypted fields.
    """
    stmt = select(AnafToken).where(AnafToken.farm_id == farm_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_decrypted_tokens(
    session: AsyncSession,
    *,
    farm_id: UUID,
) -> dict[str, str] | None:
    """Fetch and decrypt ANAF tokens for a farm.

    Returns dict with: access_token, refresh_token, client_secret,
    client_id, cif. Returns None if no token exists for this farm.
    """
    token = await get_anaf_token_by_farm(session, farm_id=farm_id)
    if token is None:
        return None

    return {
        "access_token": decrypt_token(token.access_token_encrypted),
        "refresh_token": decrypt_token(token.refresh_token_encrypted),
        "client_secret": decrypt_token(token.client_secret_encrypted),
        "client_id": token.client_id,
        "cif": token.cif,
    }


async def update_refreshed_tokens(
    session: AsyncSession,
    *,
    farm_id: UUID,
    access_token: str,
    refresh_token: str,
    family_param: str | None,
    access_token_expires_at: datetime,
    refresh_token_expires_at: datetime,
) -> None:
    """Update tokens after a refresh.

    Encrypts before storage. Updates ``last_refreshed_at`` to now().
    """
    now = datetime.now(tz=UTC)
    stmt = (
        update(AnafToken)
        .where(AnafToken.farm_id == farm_id)
        .values(
            access_token_encrypted=encrypt_token(access_token),
            refresh_token_encrypted=encrypt_token(refresh_token),
            family_param=family_param,
            access_token_expires_at=access_token_expires_at,
            refresh_token_expires_at=refresh_token_expires_at,
            last_refreshed_at=now,
            updated_at=now,
        )
    )
    await session.execute(stmt)
    await session.flush()


async def delete_anaf_token(
    session: AsyncSession,
    *,
    farm_id: UUID,
) -> bool:
    """Delete ANAF token for a farm (disconnect). Returns True if deleted."""
    stmt = (
        delete(AnafToken)
        .where(AnafToken.farm_id == farm_id)
        .returning(AnafToken.id)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none() is not None


async def needs_refresh(
    session: AsyncSession,
    *,
    farm_id: UUID,
) -> bool | None:
    """Check if the access token needs refreshing.

    Returns True if >70% of access token lifetime has elapsed.
    Returns None if no token exists.
    """
    token = await get_anaf_token_by_farm(session, farm_id=farm_id)
    if token is None:
        return None

    now = datetime.now(tz=UTC)

    # Determine when the token was issued (or last refreshed)
    issued_at = token.last_refreshed_at or token.created_at
    # Ensure timezone-aware comparison
    if issued_at.tzinfo is None:
        issued_at = issued_at.replace(tzinfo=UTC)
    expires_at = token.access_token_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)

    total_lifetime = (expires_at - issued_at).total_seconds()
    if total_lifetime <= 0:
        return True

    elapsed = (now - issued_at).total_seconds()
    return elapsed / total_lifetime > 0.7


async def list_all_active_tokens(
    session: AsyncSession,
) -> list[AnafToken]:
    """List all ANAF tokens with non-expired refresh tokens.

    Used by the scheduler to find farms that need syncing.
    Farms whose refresh tokens have expired are excluded —
    they need to re-authorize with their USB certificate.
    """
    now = datetime.now(tz=UTC)
    stmt = select(AnafToken).where(
        AnafToken.refresh_token_expires_at > now
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
