"""Application settings — all configuration via environment variables.

Nothing here is hardcoded business logic; economy coefficients live in the
DB `economy_config` table (seeded), not in this file.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ---- App ----
    app_env: str = "dev"
    log_level: str = "INFO"

    # ---- Database ----
    database_url: str = "postgresql+asyncpg://glitch:change_me_pg@postgres:5432/glitch_salvage"
    database_url_sync: str = "postgresql+psycopg://glitch:change_me_pg@postgres:5432/glitch_salvage"

    # ---- MQTT ----
    mqtt_host: str = "mosquitto"
    mqtt_port: int = 1883
    mqtt_user: str = "glitch_edge"
    mqtt_password: str = "change_me_mqtt"
    mqtt_keepalive: int = 60

    # ---- JWT ----
    jwt_secret: str = "change_me_to_a_long_random_string"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
