"""Tests for database/encryption.py — Fernet encrypt/decrypt round-trips."""

from __future__ import annotations

import pytest
from cryptography.fernet import Fernet


@pytest.fixture(autouse=True)
def _set_encryption_key(monkeypatch: pytest.MonkeyPatch) -> None:
    """Set a test encryption key for all tests in this module."""
    key = Fernet.generate_key().decode()
    monkeypatch.setenv("ANAF_ENCRYPTION_KEY", key)
    # Force re-read of settings by reimporting
    import importlib

    import farm_copilot.database.encryption as enc_mod

    enc_mod._settings = enc_mod.EncryptionSettings()
    importlib.reload(enc_mod)


class TestEncryption:
    """Fernet encryption round-trip tests."""

    def test_round_trip(self) -> None:
        """Encrypt then decrypt returns original string."""
        from farm_copilot.database.encryption import decrypt_token, encrypt_token

        plaintext = "my_secret_access_token_12345"
        ciphertext = encrypt_token(plaintext)
        assert ciphertext != plaintext
        assert decrypt_token(ciphertext) == plaintext

    def test_different_plaintexts_different_ciphertexts(self) -> None:
        """Different plaintexts produce different ciphertexts."""
        from farm_copilot.database.encryption import encrypt_token

        ct1 = encrypt_token("token_a")
        ct2 = encrypt_token("token_b")
        assert ct1 != ct2

    def test_empty_key_raises_runtime_error(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Empty key raises RuntimeError with helpful message."""
        monkeypatch.setenv("ANAF_ENCRYPTION_KEY", "")
        import importlib

        import farm_copilot.database.encryption as enc_mod

        enc_mod._settings = enc_mod.EncryptionSettings()
        importlib.reload(enc_mod)

        with pytest.raises(RuntimeError, match="ANAF_ENCRYPTION_KEY not set"):
            enc_mod.encrypt_token("test")

    def test_unicode_romanian_diacritics(self) -> None:
        """Romanian diacritics encrypt/decrypt correctly."""
        from farm_copilot.database.encryption import decrypt_token, encrypt_token

        plaintext = "Țărănesc șervet în față"
        ciphertext = encrypt_token(plaintext)
        assert decrypt_token(ciphertext) == plaintext

    def test_long_jwt_length_string(self) -> None:
        """JWT-length strings (>1000 chars) work correctly."""
        from farm_copilot.database.encryption import decrypt_token, encrypt_token

        plaintext = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9." + "a" * 1200
        ciphertext = encrypt_token(plaintext)
        assert decrypt_token(ciphertext) == plaintext
        assert len(plaintext) > 1000
