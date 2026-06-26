"""Row-Level Security policies for tenant isolation (Postgres only).

Additive and idempotent: ENABLE + FORCE RLS and a tenant_isolation policy on every
tenant table (from core.tenant_tables.all_tenant_tables()), an id-based policy on
`companies`, and FK-derived policies on child tables that have no company_id of
their own. NO-OP on SQLite (dialect-guarded), so dev is untouched.

Every table is guarded with to_regclass() so a raw table that doesn't exist in a
given DB is skipped rather than aborting the whole migration.

Run AS THE TABLE OWNER (alembic/env.py prefers ADMIN_DATABASE_URL). The runtime
app must connect as a NON-SUPERUSER, NON-BYPASSRLS role (vela_app) or FORCE RLS is
silently ineffective. See docs/RLS.md.

Revision ID: 0001_rls_policies
Revises:
Create Date: 2026-06-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_rls_policies"
down_revision = None
branch_labels = None
depends_on = None

_GUC = "current_setting('app.current_company_id', true)"

# Child tables with NO company_id column — isolated transitively through a parent
# FK. The parent is itself RLS'd, so `SELECT id FROM parent` only yields the
# current tenant's ids, scoping the child without a denormalized company_id.
#   child: (fk_column, parent_table)
_FK_CHILD_POLICIES = {
    "employee_feedback": ("employee_id", "employees"),
    "marketing_campaign_metrics": ("campaign_id", "marketing_campaigns"),
}


def _is_pg() -> bool:
    return op.get_bind().dialect.name == "postgresql"


def _exists(bind, table) -> bool:
    return bind.execute(sa.text("SELECT to_regclass(:n)"), {"n": f"public.{table}"}).scalar() is not None


def _enable_force(table) -> None:
    op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
    op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")


def upgrade() -> None:
    if not _is_pg():
        return  # RLS is a Postgres feature; SQLite dev keeps app-layer scoping
    from core.tenant_tables import all_tenant_tables
    bind = op.get_bind()

    for t in all_tenant_tables():
        if not _exists(bind, t):
            continue  # raw table not present in this DB — skip, don't abort
        _enable_force(t)
        op.execute(
            f"CREATE POLICY tenant_isolation ON {t} "
            f"USING (company_id = {_GUC}::int) "
            f"WITH CHECK (company_id = {_GUC}::int)"
        )

    # companies is keyed by `id`, not company_id — protect by id so a forgotten
    # WHERE can't leak the customer roster. Superadmin reads go through the
    # BYPASSRLS role (NETWORK_DB_URL), so this does not break the backoffice.
    if _exists(bind, "companies"):
        _enable_force("companies")
        op.execute(
            f"CREATE POLICY tenant_isolation ON companies "
            f"USING (id = {_GUC}::int) WITH CHECK (id = {_GUC}::int)"
        )

    # FK-only child tables (no company_id) — isolate via the parent's visible ids.
    for child, (fk, parent) in _FK_CHILD_POLICIES.items():
        if not _exists(bind, child) or not _exists(bind, parent):
            continue
        _enable_force(child)
        op.execute(
            f"CREATE POLICY tenant_isolation ON {child} "
            f"USING ({fk} IN (SELECT id FROM {parent})) "
            f"WITH CHECK ({fk} IN (SELECT id FROM {parent}))"
        )
    # NOTE: `users` is intentionally NOT RLS'd — login queries it pre-tenant and
    # NULL-company superadmins must remain reachable. It stays app-scoped.


def downgrade() -> None:
    if not _is_pg():
        return
    from core.tenant_tables import all_tenant_tables
    bind = op.get_bind()

    for t in list(all_tenant_tables()) + ["companies"] + list(_FK_CHILD_POLICIES):
        if not _exists(bind, t):
            continue
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {t}")
        op.execute(f"ALTER TABLE {t} NO FORCE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {t} DISABLE ROW LEVEL SECURITY")
