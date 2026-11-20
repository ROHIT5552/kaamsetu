"""Application Configuration Module

Loads environment variables, validates configuration, and provides typed settings.
Uses pydantic-settings with sensible local development defaults.
"""

from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json


class Settings(BaseSettings):
    # Application Environment
    APP_ENV: str = Field(default="development", description="Environment: development, staging, production")
    APP_NAME: str = Field(default="KaamSetu-Backend", description="Service name")
    DEBUG: bool = Field(default=False, description="Debug mode")
    SECRET_KEY: str = Field(
        default="dev_secret_key_kaamsetu_sambhajinagar_2026_pilot",
        description="Cryptographic secret key for signing tokens and sessions"
    )

    # Server Settings
    HOST: str = Field(default="0.0.0.0", description="Bind host")
    PORT: int = Field(default=8000, description="Bind port")
    CORS_ORIGINS: Union[List[str], str] = Field(
        default=["http://localhost:3000", "http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:5173"],
        description="Allowed CORS origins"
    )

    # PostgreSQL + PostGIS Connection
    POSTGRES_USER: str = Field(default="kaamsetu_user")
    POSTGRES_PASSWORD: str = Field(default="kaamsetu_secure_dev_password")
    POSTGRES_DB: str = Field(default="kaamsetu_db")
    POSTGRES_HOST: str = Field(default="localhost")
    POSTGRES_PORT: int = Field(default=5432)

    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://kaamsetu_user:kaamsetu_secure_dev_password@localhost:5432/kaamsetu_db",
        description="Async database connection string"
    )
    DATABASE_URL_SYNC: str = Field(
        default="postgresql://kaamsetu_user:kaamsetu_secure_dev_password@localhost:5432/kaamsetu_db",
        description="Synchronous database connection string for Alembic migrations"
    )
    TEST_DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///:memory:",
        description="Isolated in-memory test database URL"
    )

    # External Provider Abstractions
    OTP_PROVIDER: str = Field(default="mock_console", description="OTP delivery provider")
    SMS_PROVIDER: str = Field(default="mock_sms", description="SMS service provider")
    STORAGE_PROVIDER: str = Field(default="local_disk", description="Document storage provider")
    MAPS_PROVIDER: str = Field(default="osm_nominatim", description="Geocoding and mapping provider")
    PAYMENT_PROVIDER: str = Field(default="manual_upi_reconciliation", description="Payment gateway/verification provider")

    # Security & OTP Constraints
    OTP_EXPIRY_SECONDS: int = Field(default=300, description="OTP validity window in seconds")
    OTP_MAX_ATTEMPTS: int = Field(default=5, description="Maximum invalid OTP attempts before locking")
    JWT_ALGORITHM: str = Field(default="HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=1440)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:8080", "http://127.0.0.1:8080"]


settings = Settings()
