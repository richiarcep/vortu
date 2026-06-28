-- Vela · staging — FULL schema sync (Postgres). Run ONCE as the Postgres OWNER.
--
-- Closes every remaining "ad-hoc table missing on staging → 500" gap found by the
-- whole-codebase schema sweep. These tables were only ever created by hand on the
-- old dev SQLite and never scripted, so they don't exist on the staging Postgres.
-- Reconstructed from EVERY raw-SQL reference in the backend. Fully idempotent.
--
--   cd /opt/vela-backend
--   PGUSER=$(grep -E '^POSTGRES_USER=' .env|cut -d= -f2-); : "${PGUSER:=vela}"
--   PGDB=$(grep -E '^POSTGRES_DB=' .env|cut -d= -f2-); : "${PGDB:=vela}"
--   docker compose -f docker-compose.staging.yml exec -T postgres \
--     psql -U "$PGUSER" -d "$PGDB" -v ON_ERROR_STOP=1 \
--     < alembic/sql/staging_full_schema_sync.sql
--
-- (Supersedes staging_backoffice_schema.sql — includes everything in it + more.)

BEGIN;

-- ════ vera_models_config: DB-stored API key + last-test status (Vera Router → models tab) ════
ALTER TABLE vera_models_config ADD COLUMN IF NOT EXISTS api_key_value TEXT;
ALTER TABLE vera_models_config ADD COLUMN IF NOT EXISTS api_key_status TEXT;
ALTER TABLE vera_models_config ADD COLUMN IF NOT EXISTS api_key_last_test_at TEXT;
ALTER TABLE vera_models_config ADD COLUMN IF NOT EXISTS api_key_last_error TEXT;

-- ════ Document-extraction prompt templates (the "Prompts AI" back-office screen) ════
CREATE TABLE IF NOT EXISTS doc_templates (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE,
    label TEXT,
    icon TEXT,
    color TEXT,
    module_target TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);
CREATE TABLE IF NOT EXISTS doc_template_prompts (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES doc_templates(id) ON DELETE CASCADE,
    prompt_key TEXT,
    label TEXT,
    description TEXT,
    prompt_text TEXT,
    is_default INTEGER DEFAULT 0,
    is_system INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    times_used INTEGER DEFAULT 0,
    accuracy_score REAL DEFAULT 0,
    corrections_avg REAL DEFAULT 0,
    last_evaluated_at TEXT,
    created_at TEXT
);
CREATE TABLE IF NOT EXISTS doc_provider_prompt_assignment (
    id SERIAL PRIMARY KEY,
    prompt_id INTEGER REFERENCES doc_template_prompts(id) ON DELETE CASCADE,
    provider_name TEXT,
    provider_cif TEXT,
    accuracy_score REAL DEFAULT 0,
    times_used INTEGER DEFAULT 0,
    created_at TEXT
);
CREATE TABLE IF NOT EXISTS doc_template_fields (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES doc_templates(id) ON DELETE CASCADE,
    section TEXT,
    section_order INTEGER DEFAULT 0,
    field_order INTEGER DEFAULT 0,
    field_key TEXT,
    label TEXT,
    field_type TEXT,
    is_required INTEGER DEFAULT 0,
    is_enabled INTEGER DEFAULT 1,
    is_repeating INTEGER DEFAULT 0,
    regex_pattern TEXT,
    keywords_json TEXT,
    position_hint TEXT,
    validator TEXT,
    fallback_strategy TEXT,
    default_value TEXT,
    ai_hint TEXT,
    example_value TEXT,
    options_json TEXT,
    created_at TEXT,
    updated_at TEXT
);
CREATE INDEX IF NOT EXISTS ix_dtp_template ON doc_template_prompts (template_id);
CREATE INDEX IF NOT EXISTS ix_dppa_prompt ON doc_provider_prompt_assignment (prompt_id);
CREATE INDEX IF NOT EXISTS ix_dtf_template ON doc_template_fields (template_id);

-- ════ Vera plans / quota / insights / pipeline / plus-requests ════
CREATE TABLE IF NOT EXISTS vera_plans (
    id SERIAL PRIMARY KEY,
    plan_key TEXT NOT NULL UNIQUE,
    display_name TEXT,
    price_eur_monthly REAL DEFAULT 0,
    description TEXT,
    tokens_daily_limit INTEGER DEFAULT 80000,
    primary_model TEXT,
    fallback_model TEXT,
    memory_days INTEGER DEFAULT 7,
    features_json TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS vera_token_usage (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    date_local TEXT NOT NULL,
    tokens_sonnet_input INTEGER NOT NULL DEFAULT 0,
    tokens_sonnet_output INTEGER NOT NULL DEFAULT 0,
    tokens_haiku_input INTEGER NOT NULL DEFAULT 0,
    tokens_haiku_output INTEGER NOT NULL DEFAULT 0,
    tokens_premium_input INTEGER NOT NULL DEFAULT 0,
    tokens_premium_output INTEGER NOT NULL DEFAULT 0,
    requests_sonnet INTEGER NOT NULL DEFAULT 0,
    requests_haiku INTEGER NOT NULL DEFAULT 0,
    requests_premium INTEGER NOT NULL DEFAULT 0,
    degraded_at TEXT,
    notif_70_sent INTEGER NOT NULL DEFAULT 0,
    notif_90_sent INTEGER NOT NULL DEFAULT 0,
    notif_100_sent INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT,
    CONSTRAINT uq_vera_token_usage_company_date UNIQUE (company_id, date_local)
);
CREATE INDEX IF NOT EXISTS idx_vera_token_usage_company_date ON vera_token_usage (company_id, date_local);

CREATE TABLE IF NOT EXISTS vera_insights_cache (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    modulo TEXT NOT NULL,
    content_json TEXT,
    generated_at TEXT,
    tokens_used INTEGER DEFAULT 0,
    CONSTRAINT uq_vera_insights_cache_company_modulo UNIQUE (company_id, modulo)
);
CREATE INDEX IF NOT EXISTS idx_vera_insights_cache_company_modulo ON vera_insights_cache (company_id, modulo);

CREATE TABLE IF NOT EXISTS vera_pipeline_config (
    id SERIAL PRIMARY KEY,
    plan TEXT NOT NULL,
    module TEXT NOT NULL,
    config_json TEXT,
    updated_at TEXT,
    UNIQUE (plan, module)
);
CREATE INDEX IF NOT EXISTS idx_vera_pipeline_config_plan_module ON vera_pipeline_config (plan, module);

CREATE TABLE IF NOT EXISTS vera_plus_requests (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    user_id INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    requested_at TEXT NOT NULL DEFAULT (now()::text),
    resolved_at TEXT,
    resolved_by INTEGER
);
CREATE INDEX IF NOT EXISTS idx_vera_plus_requests_company_id ON vera_plus_requests (company_id);
CREATE INDEX IF NOT EXISTS idx_vera_plus_requests_status ON vera_plus_requests (status);

-- ════ subscriptions (GDPR export reads this; distinct from billing_subscriptions) ════
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    plan_id TEXT NOT NULL DEFAULT 'trial',
    status TEXT NOT NULL DEFAULT 'inactive',
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    current_period_start TEXT,
    current_period_end TEXT,
    cancel_at_period_end INTEGER DEFAULT 0,
    auto_renew INTEGER DEFAULT 1,
    fase TEXT DEFAULT 'beta',
    created_at TEXT DEFAULT (now()::text),
    updated_at TEXT DEFAULT (now()::text)
);
CREATE INDEX IF NOT EXISTS ix_subscriptions_user_id ON subscriptions (user_id);

-- ════ expenses (Vera insights costes/marketing read this; flat TEXT category) ════
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    category TEXT,
    amount REAL,
    date TEXT,
    created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_expenses_company_date ON expenses (company_id, date);

-- ════ GRANTs so the RLS app/worker roles can use everything new ════
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'vela_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vela_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vela_app;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'vela_worker') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vela_worker;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vela_worker;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'vela_network_ro') THEN
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO vela_network_ro;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vela_network_ro;
  END IF;
END $$;

COMMIT;
