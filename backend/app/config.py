from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str
    redis_url: str = "redis://localhost:6379/0"

    token_encryption_key: str
    session_secret_key: str

    sendgrid_api_key: str = ""
    email_from: str = "notifications@canvaschecker.app"
    email_from_name: str = "Canvas Checker"

    app_url: str = "http://localhost:5173"
    extra_origins: str = ""
    environment: str = "development"

    @property
    def allowed_origins(self) -> list[str]:
        origins = [self.app_url]
        if self.extra_origins:
            origins += [o.strip() for o in self.extra_origins.split(",")]
        return origins

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
