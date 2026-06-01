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