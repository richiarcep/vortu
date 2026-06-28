-- Vela · staging — Vera chat/routing schema (Postgres).
--
-- WHY: Vera v2 chat + routing tables were only ever created by the standalone
-- SQLite scripts migration_vera_v2.py / migration_vera_routing.py (hardcoded
-- ~/Desktop paths), which never ran against staging Postgres. As a result
-- vera_conversations / vera_messages / vera_usage_daily / vera_routing_rules /
-- vera_routing_logs / vera_models_config do NOT exist on staging, so:
--   • the Vera CHAT endpoint (POST /api/vera/v2/chat) 500s — it INSERTs into
--     vera_messages / reads vera_conversations with no graceful fallback;
--   • every AI call logs an UndefinedTable warning for vera_models_config
--     (it degrades to llm_router._DEFAULT_MODELS, so the AI still works).
-- This file is the Postgres translation of those two migrations, idempotent.
--
-- HOW TO RUN (server, as the Postgres OWNER/superuser — NOT vela_app):
--   cd /opt/vela-backend
--   PGUSER=$(grep -E '^POSTGRES_USER=' .env|cut -d= -f2-); : "${PGUSER:=vela}"
--   PGDB=$(grep -E '^POSTGRES_DB=' .env|cut -d= -f2-); : "${PGDB:=vela}"
--   docker compose -f docker-compose.staging.yml exec -T postgres \
--     psql -U "$PGUSER" -d "$PGDB" -v ON_ERROR_STOP=1 \
--     < alembic/sql/staging_vera_schema.sql

BEGIN;

-- ── Persistent chats (one row per conversation) ──
CREATE TABLE IF NOT EXISTS vera_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    company_id INTEGER,
    title TEXT NOT NULL DEFAULT 'Nuevo chat',
    module TEXT,
    is_pinned INTEGER DEFAULT 0,
    is_archived INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- ── Messages within a conversation ──
CREATE TABLE IF NOT EXISTS vera_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES vera_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    model_used TEXT,
    is_plus INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    cost_estimated REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT now()
);

-- ── Daily per-user usage counter (drives plan degradation / decide_model) ──
CREATE TABLE IF NOT EXISTS vera_usage_daily (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    company_id INTEGER,
    date TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'base',
    sonnet_count INTEGER DEFAULT 0,
    haiku_count INTEGER DEFAULT 0,
    blocked_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0,
    UNIQUE (user_id, date)
);

-- ── Routing rules (how Vera routes across LLMs) ──
CREATE TABLE IF NOT EXISTS vera_routing_rules (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    module TEXT,
    trigger_keywords TEXT,
    trigger_question_type TEXT,
    strategy TEXT NOT NULL DEFAULT 'cascade',
    models TEXT NOT NULL DEFAULT '["claude"]',
    consensus_mode TEXT DEFAULT 'first',
    priority INTEGER DEFAULT 100,
    flow_data TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- ── Routing logs (which model answered, latency, cost) ──
CREATE TABLE IF NOT EXISTS vera_routing_logs (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER REFERENCES vera_routing_rules(id),
    user_id INTEGER,
    company_id INTEGER,
    question TEXT,
    module TEXT,
    strategy_used TEXT,
    models_called TEXT,
    winning_model TEXT,
    response_preview TEXT,
    tokens_input INTEGER,
    tokens_output INTEGER,
    latency_ms INTEGER,
    cost_estimated REAL,
    consensus_score REAL,
    created_at TIMESTAMP DEFAULT now()
);

-- ── Per-provider model config (API key env, model id, costs) ──
CREATE TABLE IF NOT EXISTS vera_models_config (
    id SERIAL PRIMARY KEY,
    provider TEXT NOT NULL UNIQUE,
    display_name TEXT,
    model_id TEXT NOT NULL,
    api_key_env TEXT,
    base_url TEXT,
    is_active INTEGER DEFAULT 1,
    plan_required TEXT DEFAULT 'base',
    cost_per_1k_input REAL DEFAULT 0,
    cost_per_1k_output REAL DEFAULT 0,
    max_tokens INTEGER DEFAULT 4096,
    timeout_seconds INTEGER DEFAULT 30,
    config_json TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conv_user ON vera_conversations (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON vera_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON vera_usage_daily (user_id, date);

-- ── Seed: model config — matches vera/llm_router.py _DEFAULT_MODELS exactly
-- (claude active w/ claude-sonnet-4-6; others inactive). Same behaviour as the
-- code default, but removes the per-call UndefinedTable log noise. ──
INSERT INTO vera_models_config
    (provider, display_name, model_id, api_key_env, base_url, is_active, plan_required,
     cost_per_1k_input, cost_per_1k_output, max_tokens, timeout_seconds, config_json)
VALUES
    ('claude','Claude Sonnet 4.6','claude-sonnet-4-6','ANTHROPIC_API_KEY','https://api.anthropic.com',1,'base',3.0,15.0,4096,30,'{}'),
    ('openai','GPT-4o','gpt-4o','OPENAI_API_KEY','https://api.openai.com/v1',0,'plus',2.5,10.0,4096,30,'{}'),
    ('gemini','Gemini 1.5 Pro','gemini-1.5-pro','GEMINI_API_KEY','https://generativelanguage.googleapis.com/v1beta',0,'plus',1.25,5.0,8192,30,'{}'),
    ('perplexity','Perplexity Sonar','sonar','PERPLEXITY_API_KEY','https://api.perplexity.ai',0,'base',1.0,1.0,4096,30,'{}')
ON CONFLICT (provider) DO NOTHING;

-- ── Seed: default routing rules (idempotent per-name) ──
INSERT INTO vera_routing_rules (name, description, module, trigger_keywords, trigger_question_type, strategy, models, consensus_mode, priority, flow_data, is_active)
 SELECT 'Default — Cascade Claude','Estrategia por defecto: prueba Claude, fallback si falla',NULL,NULL,NULL,'cascade','["claude"]','first',100,NULL,1
 WHERE NOT EXISTS (SELECT 1 FROM vera_routing_rules WHERE name = 'Default — Cascade Claude');
INSERT INTO vera_routing_rules (name, description, module, trigger_keywords, trigger_question_type, strategy, models, consensus_mode, priority, flow_data, is_active)
 SELECT 'Análisis financiero crítico','Para contabilidad: chequeo cruzado Claude + GPT','contabilidad','analisis,balance,IVA,impuestos,fiscal','analytical','parallel','["claude","openai"]','consensus',10,NULL,1
 WHERE NOT EXISTS (SELECT 1 FROM vera_routing_rules WHERE name = 'Análisis financiero crítico');
INSERT INTO vera_routing_rules (name, description, module, trigger_keywords, trigger_question_type, strategy, models, consensus_mode, priority, flow_data, is_active)
 SELECT 'Búsqueda con datos actuales','Cuando pide info actualizada: Perplexity + Claude para sintetizar',NULL,'noticias,actual,hoy,último,reciente,mercado','realtime','cascade','["perplexity","claude"]','first',20,NULL,1
 WHERE NOT EXISTS (SELECT 1 FROM vera_routing_rules WHERE name = 'Búsqueda con datos actuales');

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
