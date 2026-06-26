"""Canonical list of tenant-scoped tables for Row-Level Security.

Derived from Base.metadata (every mapped table that has a ``company_id`` column)
so it can NEVER drift from the models, PLUS the raw (non-ORM) tenant tables that
are created in ensure_runtime_schema / setup_db and therefore aren't in the
metadata. This single source of truth feeds the RLS migration.

Deliberately EXCLUDED:
- ``users`` / ``companies`` — keyed by ``id`` (or a nullable company_id), and
  read pre-tenant during login, so a ``company_id = current_setting(...)`` policy
  would break auth. ``companies`` needs its own ``id = current_setting(...)``
  policy if protected; ``users`` stays app-scoped. Both are listed in
  ``IDENTITY_TABLES`` so the migration handles them explicitly, not silently.
- ``security_audit_log`` / ``refresh_tokens`` — security infrastructure, not
  tenant business data (audit spans tenants; refresh tokens are per-user).
"""
from typing import List

# Raw (non-ORM) tables that carry company_id but have no SQLAlchemy model, so
# they don't appear in Base.metadata. Keep in sync with ensure_runtime_schema /
# setup_db when new raw tenant tables are added.
RAW_TENANT_TABLES = [
    # Fiscal (multi-country e-invoicing) — created in ensure_runtime_schema.
    "config_fiscal",
    "dte_emitidos",
    "dte_recibidos",
    "dte_contingencia",
    # Evidence-extraction pipeline.
    "doc_fingerprints",
    "extraction_runs",
    "extraction_feedback",
    "extraction_review_queue",
    "registro_diario",
    # Finance snapshots (per-tenant projections / business snapshots).
    "financial_snapshots",
    "proyecciones_snapshots",
    # Transient request/payment state (carry company_id).
    "pending_documents",
    "pending_pos_sales",
    # Veri*Factu (España).
    "verifactu_registro",
    "verifactu_eventos",
    "verifactu_config",
    "verifactu_mode_audit",
    "verifactu_retry_queue",
]

# Identity/auth tables that must NOT get a plain company_id RLS policy.
IDENTITY_TABLES = ["users", "companies"]


def orm_tenant_tables() -> List[str]:
    """ORM tables that have a ``company_id`` column, from the live metadata."""
    from core.database import Base
    out = []
    for table in Base.metadata.sorted_tables:
        if "company_id" in table.columns and table.name not in IDENTITY_TABLES:
            out.append(table.name)
    return out


def all_tenant_tables() -> List[str]:
    """The full tenant-table list (ORM + raw), de-duplicated and sorted."""
    seen = set(orm_tenant_tables()) | set(RAW_TENANT_TABLES)
    return sorted(seen)
