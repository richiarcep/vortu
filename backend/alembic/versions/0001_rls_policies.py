"""Row-Level Security policies for tenant isolation (Postgres only).

Additive and idempotent: ENABLE + FORCE RLS and a tenant_isolation policy on every
tenant table (from core.tenant_tables.all_tenant_tables()), plus an id-based policy
on `companies`. NO-OP on SQLite (dialect-guarded), so dev is untouched.

Run AFTER the app has booted at least once (create_all + ensure_runtime_schema
create the tables this migration ALTERs). The app must connect as a NON-SUPERUSER,
NON-BYPASSRLS role (see docs/RLS.md) or FORCE RLS is silently ineffective.

Revision ID: 0001_rls_policies
Revises:
Create Date: 2026-06-26
"""
from alembic import op

revision = "0001_rls_policies"
down_revision = None
branch_labels = None
depends_on = None

_GUC = "current_setting('app.current_company_id', true)"


def _is_pg() -> bool:
    return op.get_bind().dialect.name == "postgresql"


def upgrade() -> None:
    if not _is_pg():
        return  # RLS is a Postgres feature; SQLite dev keeps app-layer scoping
    from core.tenant_tables import all_tenant_tables

    for t in all_tenant_tables():
        op.execute(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {t} FORCE ROW LEVEL SECURITY")
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {t}")
        op.execute(
            f"CREATE POLICY tenant_isolation ON {t} "
            f"USING (company_id = {_GUC}::int) "
            f"WITH CHECK (company_id = {_GUC}::int)"
        )

    # companies is keyed by `id`, not company_id — protect by id so a forgotten
    # WHERE can't leak the customer roster. Superadmin reads go through the
    # BYPASSRLS role (NETWORK_DB_URL), so this does not break the backoffice.
    op.execute("ALTER TABLE companies ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE companies FORCE ROW LEVEL SECURITY")
    op.execute("DROP POLICY IF EXISTS tenant_isolation ON companies")
    op.execute(
        f"CREATE POLICY tenant_isolation ON companies "
        f"USING (id = {_GUC}::int) WITH CHECK (id = {_GUC}::int)"
    )
    # NOTE: `users` is intentionally NOT RLS'd — login queries it pre-tenant and
    # NULL-company superadmins must remain reachable. It stays app-scoped.


def downgrade() -> None:
    if not _is_pg():
        return
    from core.tenant_tables import all_tenant_tables

    for t in list(all_tenant_tables()) + ["companies"]:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {t}")
        op.execute(f"ALTER TABLE {t} NO FORCE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {t} DISABLE ROW LEVEL SECURITY")
