"""Alembic environment.

The database URL and the engine come from the app's own config/database modules
so migrations always target the same DB as the running app. Importing `main`
registers every ORM model on `Base.metadata`, which is what `--autogenerate`
diffs against.
"""
from logging.config import fileConfig

from alembic import context

from core.config import get_settings
from core.database import Base, engine
import main  # noqa: F401  — side-effect import: registers all ORM models on Base.metadata

config = context.config
config.set_main_option("sqlalchemy.url", get_settings().DATABASE_URL)
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=get_settings().DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
