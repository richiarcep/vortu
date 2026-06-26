from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache

# Placeholder values that must never reach a running app — they signal a
# missing/un-configured environment and would silently weaken security.
_INSECURE_SECRETS = {"change-this-in-production", ""}


class Settings(BaseSettings):
    APP_NAME: str = "Vela"
    APP_VERSION: str = "1.0.0"
    # Secure-by-default: stack traces are NOT exposed unless explicitly enabled.
    DEBUG: bool = False

    # ── Required secrets (no defaults — app fails to start if unset) ─────────
    DATABASE_URL: str
    SECRET_KEY: str

    # Neo4j is OPTIONAL: empty password disables the Vera graph features but lets
    # the app start. The driver connects lazily, so graph endpoints simply return
    # empty/unavailable until a credential is provided.
    NEO4J_PASSWORD: str = ""

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
    # Observability / hardening (all optional; safe no-op defaults).
    SENTRY_DSN: str = ""                       # error tracking; disabled when empty
    ENVIRONMENT: str = "development"           # tags Sentry events (production/staging/…)
    SENTRY_TRACES_SAMPLE_RATE: float = 0.0     # perf tracing sample rate
    DB_STATEMENT_TIMEOUT_S: int = 30           # hard per-statement execution timeout
    NETWORK_DAILY_USD_CAP: float = 25.0        # network-agent per-super-admin daily ceiling
    NETWORK_PER_SESSION_USD_CAP: float = 5.0   # network-agent per-request ceiling
    REDIS_URL: str = ""                        # shared rate-limit store; in-memory fallback when empty
    TRUSTED_PROXY: bool = True                 # honour X-Forwarded-For (true behind Caddy/our proxy)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30        # rotating refresh-token lifetime
    REFRESH_COOKIE_NAME: str = "vela_refresh"  # HttpOnly refresh-token cookie name
    RLS_ENABLED: bool = True                    # Postgres RLS kill-switch (ignored on SQLite)
    MANAGE_SCHEMA: bool = True                   # run create_all + ensure_runtime_schema at startup. Set false when the app connects as a NON-OWNER role (vela_app under RLS): that role can't run the DROP/CREATE INDEX/TRIGGER DDL, so schema is managed out-of-band by the owner.
    APP_DB_ROLE: str = ""                       # optional non-BYPASSRLS role to SET ROLE into
    NETWORK_DB_URL: str = ""                    # read-only BYPASSRLS DSN for the cross-tenant agent
    WORKER_DB_URL: str = ""                      # write-capable BYPASSRLS DSN for background jobs (else SessionLocal)
    ADMIN_DATABASE_URL: str = ""                 # OWNER/superuser DSN used ONLY for DDL + alembic migrations (creates/ALTERs tables, applies RLS policies). MUST NOT be set in the web tier — it bypasses RLS. Falls back to DATABASE_URL when empty.
    AEAT_VERIFACTU_ENDPOINT: str = ""           # AEAT remittance endpoint; empty → SANDBOX (no real submit)
    CONNECT_APPLICATION_FEE_BPS: int = 0        # platform fee on company sales (bps; 0 = none)
    STRIPE_USE_CONFIGURED_PRICES: bool = False  # use STRIPE_PRICE_* ids; default → inline price_data
    # ── Vera connector (external AI routing service) ─────────────────────────────
    # Document extraction can route through the external Vera API (/v1/extract) as
    # the PRIMARY engine, falling back to Vela's own in-app extraction pipeline when
    # Vera is unreachable/fails. OFF by default (mode=internal) — nothing changes
    # until VERA_API_URL is set and the mode is switched to "vera".
    VERA_API_URL: str = ""                       # e.g. http://localhost:8787 (no trailing slash)
    VERA_API_KEY: str = ""                       # sent as the X-Vera-Key header (master or per-project key)
    VERA_EXTRACTION_MODE: str = "internal"       # "internal" (current behaviour) | "vera" (API primary + internal fallback)
    VERA_TRAIN_ENABLED: bool = False             # POST human corrections to Vera /v1/train (the learning flywheel)
    VERA_API_TIMEOUT_S: float = 30.0             # per-call timeout for the Vera API
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
        # Optional credential: empty is allowed (graph disabled). Only reject the
        # literal known placeholder so a half-configured env can't silently "work".
        if v == "change-this-in-production":
            raise ValueError(
                "NEO4J_PASSWORD uses a known placeholder. Set the real credential "
                "or leave it empty to disable graph features."
            )
        return v

@lru_cache()
def get_settings() -> Settings:
    return Settings()

def clear_settings_cache():
    get_settings.cache_clear()
