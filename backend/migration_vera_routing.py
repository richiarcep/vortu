"""
Migración: tabla vera_routing_rules
Define cómo Vera enruta preguntas entre múltiples LLMs.
"""
import sqlite3
import os
import sys

# Path al .db (ajusta si tu DB está en otro sitio)
DB_PATHS = [
    os.path.expanduser('~/Desktop/vortu/backend/vortu.db'),
    os.path.expanduser('~/Desktop/vortu/backend/nexum.db'),
    os.path.expanduser('~/Desktop/vortu/backend/database.db'),
    os.path.expanduser('~/Desktop/vortu/backend/bizos.db'),
    os.path.expanduser('~/Desktop/vortu/backend/app.db'),
]

db_path = None
for p in DB_PATHS:
    if os.path.exists(p):
        db_path = p
        break

if not db_path:
    # Busca cualquier .db en backend/
    backend = os.path.expanduser('~/Desktop/vortu/backend')
    if os.path.exists(backend):
        for f in os.listdir(backend):
            if f.endswith('.db'):
                db_path = os.path.join(backend, f)
                break

if not db_path:
    print("❌ No encuentro la BD. Pásame el path manualmente.")
    sys.exit(1)

print(f"📁 Usando BD: {db_path}")

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Tabla principal de reglas de routing
cur.execute("""
CREATE TABLE IF NOT EXISTS vera_routing_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

# Tabla de logs de routing (qué modelo respondió, latencia, coste)
cur.execute("""
CREATE TABLE IF NOT EXISTS vera_routing_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id INTEGER,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rule_id) REFERENCES vera_routing_rules(id)
)
""")

# Tabla de configuración de modelos (API keys, modelos exactos, costes)
cur.execute("""
CREATE TABLE IF NOT EXISTS vera_models_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

# Seed: configuración por defecto de los 4 modelos
default_models = [
    ('claude', 'Claude Sonnet 4.6', 'claude-sonnet-4-6', 'ANTHROPIC_API_KEY',
     'https://api.anthropic.com', 1, 'base', 3.0, 15.0, 4096, 30, '{}'),
    ('openai', 'GPT-4o', 'gpt-4o', 'OPENAI_API_KEY',
     'https://api.openai.com/v1', 0, 'plus', 2.5, 10.0, 4096, 30, '{}'),
    ('gemini', 'Gemini 1.5 Pro', 'gemini-1.5-pro', 'GEMINI_API_KEY',
     'https://generativelanguage.googleapis.com/v1beta', 0, 'plus', 1.25, 5.0, 8192, 30, '{}'),
    ('perplexity', 'Perplexity Sonar', 'sonar', 'PERPLEXITY_API_KEY',
     'https://api.perplexity.ai', 0, 'base', 1.0, 1.0, 4096, 30, '{}'),
]

for m in default_models:
    cur.execute("""
        INSERT OR IGNORE INTO vera_models_config
        (provider, display_name, model_id, api_key_env, base_url,
         is_active, plan_required, cost_per_1k_input, cost_per_1k_output,
         max_tokens, timeout_seconds, config_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, m)

# Seed: 3 reglas por defecto
default_rules = [
    ('Default — Cascade Claude', 'Estrategia por defecto: prueba Claude, fallback si falla',
     None, None, None, 'cascade', '["claude"]', 'first', 100, None, 1),
    ('Análisis financiero crítico', 'Para contabilidad: chequeo cruzado Claude + GPT',
     'contabilidad', 'analisis,balance,IVA,impuestos,fiscal', 'analytical',
     'parallel', '["claude","openai"]', 'consensus', 10, None, 1),
    ('Búsqueda con datos actuales', 'Cuando pide info actualizada: Perplexity + Claude para sintetizar',
     None, 'noticias,actual,hoy,último,reciente,mercado', 'realtime',
     'cascade', '["perplexity","claude"]', 'first', 20, None, 1),
]

for r in default_rules:
    cur.execute("""
        INSERT OR IGNORE INTO vera_routing_rules
        (name, description, module, trigger_keywords, trigger_question_type,
         strategy, models, consensus_mode, priority, flow_data, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, r)

conn.commit()

# Verificar
rules = cur.execute("SELECT id, name, strategy, models FROM vera_routing_rules").fetchall()
models = cur.execute("SELECT provider, display_name, is_active FROM vera_models_config").fetchall()

print(f"\n✅ Tablas creadas correctamente")
print(f"\n📋 Modelos configurados ({len(models)}):")
for m in models:
    status = "✓ activo" if m[2] else "○ inactivo"
    print(f"   {status}  {m[0]:12} → {m[1]}")

print(f"\n📋 Reglas por defecto ({len(rules)}):")
for r in rules:
    print(f"   #{r[0]:2}  {r[1]:30} → {r[2]:10} {r[3]}")

conn.close()
print("\n✓ Done.")
