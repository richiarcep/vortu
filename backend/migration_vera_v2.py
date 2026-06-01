"""
Migración Vera v2: chats persistentes + tracking de uso diario.

Tablas nuevas:
- vera_conversations: lista de chats por usuario
- vera_messages: mensajes dentro de cada chat
- vera_usage_daily: contador de mensajes por usuario/día (para degradación)
"""
import sqlite3
import os
import sys

DB_PATHS = [
    os.path.expanduser('~/Desktop/vortu/backend/nexum.db'),
    os.path.expanduser('~/Desktop/vortu/backend/vortu.db'),
]
db_path = next((p for p in DB_PATHS if os.path.exists(p)), None)
if not db_path:
    backend = os.path.expanduser('~/Desktop/vortu/backend')
    for f in os.listdir(backend):
        if f.endswith('.db'):
            db_path = os.path.join(backend, f)
            break

if not db_path:
    print("ERROR: No encuentro la BD")
    sys.exit(1)

print(f"BD: {db_path}\n")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS vera_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    company_id INTEGER,
    title TEXT NOT NULL DEFAULT 'Nuevo chat',
    module TEXT,
    is_pinned INTEGER DEFAULT 0,
    is_archived INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

cur.execute("""
CREATE TABLE IF NOT EXISTS vera_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    model_used TEXT,
    is_plus INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    cost_estimated REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES vera_conversations(id) ON DELETE CASCADE
)
""")

cur.execute("""
CREATE TABLE IF NOT EXISTS vera_usage_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    company_id INTEGER,
    date TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'base',
    sonnet_count INTEGER DEFAULT 0,
    haiku_count INTEGER DEFAULT 0,
    blocked_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0,
    UNIQUE(user_id, date)
)
""")

cur.execute("CREATE INDEX IF NOT EXISTS idx_conv_user ON vera_conversations(user_id, updated_at DESC)")
cur.execute("CREATE INDEX IF NOT EXISTS idx_msg_conv ON vera_messages(conversation_id, created_at)")
cur.execute("CREATE INDEX IF NOT EXISTS idx_usage_user_date ON vera_usage_daily(user_id, date)")

conn.commit()

tables = cur.execute("""
    SELECT name FROM sqlite_master
    WHERE type='table' AND name LIKE 'vera_%'
""").fetchall()
print("Tablas Vera:")
for t in tables:
    count = cur.execute(f"SELECT COUNT(*) FROM {t[0]}").fetchone()[0]
    print(f"  - {t[0]} ({count} filas)")

conn.close()
print("\nOK")
