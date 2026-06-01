from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache

# Placeholder values that must never reach a running app — they signal a
# missing/un-configured environment and would silently weaken security.
_INSECURE_SECRETS = {"change-this-in-production", "", "nexum2026"}


class Settings(BaseSettings):
    APP_NAME: str = "Vortu"
    APP_VERSION: str = "1.0.0"
    # Secure-by-default: stack traces are NOT exposed unless explicitly enabled.
    DEBUG: bool = False

    # ── Required secrets (no defaults — app fails to start if unset) ─────────
    DATABASE_URL: str
    SECRET_KEY: str
    NEO4J_PASSWORD: str

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ANTHROPIC_API_KEY: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_STARTER: str = ""
    STRIPE_PRICE_PRO: str = ""
    STRIPE_PRICE_BUSINESS: str = ""
    STRIPE_PRICE_EXTRA_USER: str = ""
    STRIPE_PRICE_VERA_PLUS: str = ""
    STRIPE_LICENSE_STARTER: str = ""
    STRIPE_LICENSE_PRO: str = ""
    STRIPE_LICENSE_BUSINESS: str = ""
    APIFY_API_TOKEN: str = ""
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    model_config = {"env_file": ".env", "extra": "ignore"}

    @field_validator("SECRET_KEY")
    @classmethod
    def _secret_key_must_be_strong(cls, v: str) -> str:
        if v in _INSECURE_SECRETS:
            raise ValueError(
                "SECRET_KEY is unset or uses a known placeholder. Set a strong, "
                "random value in the environment (e.g. `openssl rand -hex 32`)."
            )
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters.")
        return v

    @field_validator("NEO4J_PASSWORD")
    @classmethod
    def _neo4j_password_not_placeholder(cls, v: str) -> str:
        if v in _INSECURE_SECRETS:
            raise ValueError(
                "NEO4J_PASSWORD is unset or uses a known placeholder. Set the real "
                "credential in the environment."
            )
        return v

@lru_cache()
def get_settings() -> Settings:
    return Settings()

def clear_settings_cache():
    get_settings.cache_clear()
