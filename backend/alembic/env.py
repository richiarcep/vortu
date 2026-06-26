"""Alembic environment.

Migrations run DDL (CREATE/ALTER TABLE, ENABLE/FORCE ROW LEVEL SECURITY,
CREATE POLICY) and therefore MUST connect as the table OWNER — never the runtime
app role. Under RLS the app connects as `vela_app` (NOSUPERUSER, NOBYPASSRLS,
owns nothing), so binding migrations to DATABASE_URL would make every
`ALTER TABLE … ENABLE ROW LEVEL SECURITY` raise "must be owner of table" and the
whole migration would abort. We therefore prefer ADMIN_DATABASE_URL (the owner /
bootstrap DSN) and fall back to DATABASE_URL for dev/SQLite where they coincide.

Importing `main` registers every ORM model on `Base.metadata`, which is what
`--autogenerate` diffs against.
"""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine

from core.config import get_settings
from core.database import Base
import main  # noqa: F401  — side-effect import: registers all ORM models on Base.metadata

config = context.config

_settings = get_settings()
# Owner/superuser DSN for DDL; DATABASE_URL only when no admin DSN is configured.
MIGRATION_URL = _settings.ADMIN_DATABASE_URL or _settings.DATABASE_URL

config.set_main_option("sqlalchemy.url", MIGRATION_URL)
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=MIGRATION_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # Dedicated engine on the migration (owner) URL — NOT the app `engine`, which
    # is bound to the runtime role (vela_app) and could not ALTER the tables.
    connectable = create_engine(MIGRATION_URL, pool_pre_ping=True)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()
    connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
