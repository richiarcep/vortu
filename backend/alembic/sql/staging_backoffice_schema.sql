-- Vela · staging — back-office schema gaps (Postgres).
--
-- WHY: two back-office screens 500'd because the code expects schema that was
-- only ever created ad-hoc on the old dev SQLite and never scripted:
--   • Vera Router → "models" tab: api/vera_routing_admin.py SELECTs
--     api_key_value / api_key_status / api_key_last_test_at / api_key_last_error
--     from vera_models_config (added to the code after the original table) →
--     UndefinedColumn 500.
--   • Prompts AI: api/doc_prompts_admin.py reads doc_templates /
--     doc_template_prompts / doc_provider_prompt_assignment, none of which exist
--     on staging → UndefinedTable 500.
-- This file is idempotent. Run as the Postgres OWNER (see other staging_*.sql).
--   docker compose -f docker-compose.staging.yml exec -T postgres \
--     psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 \
--     < alembic/sql/staging_backoffice_schema.sql

BEGIN;

-- ── vera_models_config: DB-stored API key + last-test status (the /models tab) ──
ALTER TABLE vera_models_config ADD COLUMN IF NOT EXISTS api_key_value TEXT;
ALTER TABLE vera_models_config ADD COLUMN IF NOT EXISTS api_key_status TEXT;
ALTER TABLE vera_models_config ADD COLUMN IF NOT EXISTS api_key_last_test_at TEXT;
ALTER TABLE vera_models_config ADD COLUMN IF NOT EXISTS api_key_last_error TEXT;

-- ── Document-extraction prompt templates (the "Prompts AI" back-office screen) ──
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
CREATE INDEX IF NOT EXISTS ix_dtp_template ON doc_template_prompts (template_id);
CREATE INDEX IF NOT EXISTS ix_dppa_prompt ON doc_provider_prompt_assignment (prompt_id);

-- ── GRANTs so the RLS app/worker roles can use the new tables/sequences ──
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
