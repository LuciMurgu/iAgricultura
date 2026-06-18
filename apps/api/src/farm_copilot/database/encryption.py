"""Fernet symmetric encryption for ANAF tokens at rest.

The encryption key is loaded from ANAF_ENCRYPTION_KEY environment variable.
Generate a key with:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

from __future__ import annotations

from cryptography.fernet import Fernet
from pydantic_settings import BaseSettings


class EncryptionSettings(BaseSettings):
    """Load ``ANAF_ENCRYPTION_KEY`` from the environment (or ``.env`` file)."""

    anaf_encryption_key: str = ""

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


_settings = EncryptionSettings()


def _get_fernet() -> Fernet:
    """Return a Fernet instance using the configured encryption key."""
    if not _settings.anaf_encryption_key:
        raise RuntimeError(
            "ANAF_ENCRYPTION_KEY not set. Generate with: "
            'python -c "from cryptography.fernet import Fernet; '
            'print(Fernet.generate_key().decode())"'
        )
    return Fernet(_settings.anaf_encryption_key.encode())


def encrypt_token(plaintext: str) -> str:
    """Encrypt a token string. Returns base64-encoded ciphertext."""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_token(ciphertext: str) -> str:
    """Decrypt a token string. Returns plaintext."""
    return _get_fernet().decrypt(ciphertext.encode()).decode()
