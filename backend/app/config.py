from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # SQLite file in cwd when you run uvicorn from backend/ — no MySQL required for local dev.
    # Override with DATABASE_URL in .env for MySQL (e.g. Docker on 3307).
    database_url: str = "sqlite:///./trella_dev.db"

    jwt_secret: str = "change-me-in-production-use-openssl-rand"
    jwt_expires_hours: int = 168

    # When True, startup loads demo seller user + sample trucks if the trucks table is empty.
    # Set TRELLA_SEED_DEMO=false in production if you want an empty inventory until real data exists.
    seed_demo: bool = Field(default=True, validation_alias="TRELLA_SEED_DEMO")

    # Directory for uploaded listing images (created on startup). Relative paths are from cwd.
    upload_dir: str = Field(default="uploads", validation_alias="TRELLA_UPLOAD_DIR")
    max_upload_bytes: int = Field(default=5 * 1024 * 1024, validation_alias="TRELLA_MAX_UPLOAD_BYTES")
    max_video_bytes: int = Field(default=80 * 1024 * 1024, validation_alias="TRELLA_MAX_VIDEO_BYTES")

    # Optional: AI category hints from listing photos (OpenAI vision).
    openai_api_key: str | None = Field(default=None, validation_alias="OPENAI_API_KEY")
    openai_vision_model: str = Field(default="gpt-4o-mini", validation_alias="OPENAI_VISION_MODEL")

    # When True, phone-change request returns debugCode in JSON and logs OTP (dev only — integrate SMS in production).
    phone_otp_debug: bool = Field(default=False, validation_alias="TRELLA_PHONE_OTP_DEBUG")

    # Admin login 2FA and signup email verification. When debug is True the code is also
    # returned as debugCode in the response for local testing. Set to false once
    # RESEND_API_KEY delivers it for real.
    admin_2fa_debug: bool = Field(default=True, validation_alias="TRELLA_ADMIN_2FA_DEBUG")

    # Minimum wait between "resend code" requests during signup email verification.
    signup_otp_cooldown_seconds: int = Field(default=110, validation_alias="TRELLA_SIGNUP_OTP_COOLDOWN_SECONDS")

    # Optional: transactional email via Resend (https://resend.com). Without a key, emails are
    # skipped and the app falls back to logging/debugCode only.
    resend_api_key: str | None = Field(default=None, validation_alias="RESEND_API_KEY")
    resend_from_email: str = Field(default="otp@maketsmart.com", validation_alias="RESEND_FROM_EMAIL")


settings = Settings()


def resolved_upload_dir() -> Path:
    p = Path(settings.upload_dir)
    return p.resolve() if p.is_absolute() else (Path.cwd() / p).resolve()
