from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    APP_NAME: str = "Vortu"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite:///./nexum.db"
    SECRET_KEY: str = "change-this-in-production"
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
    STRIPE_LICENSE_STARTER: str = ""
    STRIPE_LICENSE_PRO: str = ""
    STRIPE_LICENSE_BUSINESS: str = ""
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    model_config = {"env_file": ".env", "extra": "ignore"}

@lru_cache()
def get_settings() -> Settings:
    return Settings()
