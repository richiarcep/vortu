from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from core.config import get_settings

settings = get_settings()

# connect_args only needed for SQLite
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}

# pool_pre_ping validates a pooled connection before use, avoiding "stale
# connection" errors after the DB drops idle connections.
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Gives every route a database session, rolls back on error, closes when done."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        # Ensure a failed request never leaves a half-applied transaction behind.
        db.rollback()
        raise
    finally:
        db.close()


def create_tables():
    """Creates all tables in the database. Called once at startup."""
    Base.metadata.create_all(bind=engine)


# Tablas del agente "Vera Network Agent" (super-admin cross-empresa). Se usan
# vía raw SQL y NO tienen modelo ORM, así que create_all() no las cubre — hay
# que asegurarlas explícitamente al arranque. Esquema canónico compartido por
# todos los escritores/lectores (vera/network_engine, api/vera_network,
# api/admin, api/vera_pipeline_admin, modules/billing/stripe_service).
_NETWORK_TABLES = (
    """
    CREATE TABLE IF NOT EXISTS vera_network_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT,
        context_company_id INTEGER,
        messages_json TEXT,
        model_used TEXT,
        total_tokens INTEGER DEFAULT 0,
        total_cost_usd REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT (datetime('now')),
        updated_at TIMESTAMP DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS vera_network_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        user_email TEXT,
        endpoint TEXT,
        action TEXT,
        question TEXT,
        response_preview TEXT,
        sql_executed TEXT,
        model_used TEXT,
        tokens_input INTEGER,
        tokens_output INTEGER,
        cost_usd REAL,
        latency_ms INTEGER,
        created_at TIMESTAMP DEFAULT (datetime('now'))
    )
    """,
)


def ensure_runtime_schema():
    """Asegura el esquema que `create_all()` (solo modelos ORM) no cubre:
    - tablas raw-SQL del Vera Network Agent,
    - columnas usadas solo en SQL crudo que nunca estuvieron en un modelo.
    Idempotente: seguro de re-ejecutar en cada arranque."""
    from sqlalchemy import text
    with engine.begin() as conn:
        for stmt in _NETWORK_TABLES:
            conn.execute(text(stmt))

        # companies.plan: leída/escrita solo por SQL crudo (api/admin, billing,
        # stripe_service); nunca declarada en el modelo Company, así que la tabla
        # puede no tenerla. Sin ella, /api/admin/companies y /billing/overview dan
        # 500 "no such column: plan".
        cols = [r[1] for r in conn.execute(text("PRAGMA table_info(companies)")).fetchall()]
        if "plan" not in cols:
            conn.execute(text("ALTER TABLE companies ADD COLUMN plan TEXT DEFAULT 'base'"))