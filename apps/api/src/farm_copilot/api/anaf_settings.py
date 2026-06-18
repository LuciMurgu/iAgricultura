"""ANAF OAuth settings — loaded from environment variables."""

from __future__ import annotations

from pydantic_settings import BaseSettings


class AnafSettings(BaseSettings):
    """ANAF OAuth configuration."""

    anaf_client_id: str = ""
    anaf_client_secret: str = ""
    anaf_redirect_uri: str = "http://localhost:8000/anaf/callback"
    anaf_test_mode: bool = True  # Use test endpoints by default

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


anaf_settings = AnafSettings()
