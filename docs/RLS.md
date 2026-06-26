# Postgres Row-Level Security — tenant isolation below the app layer (§2)

**Status:** foundation shipped; **enforcement is staging-gated** (Postgres-only —
it cannot be exercised on the SQLite dev DB, where it is a deliberate no-op).

Today tenant isolation is enforced purely in the app (`.filter(company_id == current_user.company_id)`
on every endpoint). One forgotten filter, a raw `text()` query, or the super-admin
text-to-SQL agent exposes all tenants. RLS adds a hard DB-level backstop: a forgotten
filter returns **zero rows** instead of cross-tenant data.

The app-layer filters STAY (defense in depth). RLS is the backstop, not a replacement.

## What shipped (verifiable on SQLite, no-op there)

- `core.security.get_tenant_db` — a tenant-scoped session dependency. On Postgres it
  runs `SELECT set_config('app.current_company_id', cid, true)` (transaction-local =
  SET LOCAL, never leaks across pooled connections). On SQLite it's a pass-through.
- `core.tenant_tables.all_tenant_tables()` — the canonical tenant-table list, derived
  from `Base.metadata` (every model with a `company_id` column) + the raw non-ORM
  tenant tables. **49 tables** today. Can't drift from the models.
- `alembic/versions/0001_rls_policies.py` — Postgres-only, idempotent: ENABLE + FORCE
  RLS + `tenant_isolation` policy on every tenant table, plus an `id`-based policy on
  `companies`. `users` is intentionally exempt (login queries it pre-tenant).
- `alembic/sql/rls_roles.sql` — creates `vela_app` (NOBYPASSRLS, app connects as it)
  and `vela_network_ro` (BYPASSRLS, read-only, for the cross-tenant agent/backoffice).
- Config: `RLS_ENABLED` (kill-switch), `APP_DB_ROLE`, `NETWORK_DB_URL`.

## Activation runbook (do on a STAGING Postgres first)

RLS enforcement is a point-of-no-return on prod data access, so each prerequisite
below is **mandatory** — skipping any one causes a silent customer-facing outage
(routers returning zero rows) rather than a security event.

### 1. Swap every tenant router to `get_tenant_db` — ✅ DONE
`Depends(get_db)` → `Depends(get_tenant_db)` on tenant-scoped endpoints. Left on
`get_db`: auth/login/register, the Stripe webhook, and the superadmin backoffice
(`api/admin.py`, `vera_network.py`, `vera_routing_admin.py`) — pre-tenant or
legitimately cross-tenant. Swapped (verified no-op on SQLite dev):

```
sales, costes, costs, accounting, documentos, hr, customers, projects, marketing,
fiscal, finance, profit_optimizer, analytics, privacy, vera_v2, vera_plus,
vera_insights, agent, vera_route_api, vera_quota
```

`get_tenant_db` issues `set_config('app.current_company_id', …, true)` on Postgres
and is a pass-through on SQLite, so this is already live in code and inert until the
RLS policies (step 4) are applied.

### 2. Cross-tenant agent Postgres portability — ✅ DONE (still wire NETWORK_DB_URL)
`vera/network_engine.py` no longer uses `sqlite_master` / `PRAGMA table_info` (now the
SQLAlchemy inspector) nor `date('now', …)` (now Python-computed bind params), so it
runs on Postgres. **Remaining for activation:** point the agent at `NETWORK_DB_URL`
(the BYPASSRLS read-only role) and replace the SQLite-only `PRAGMA query_only` with
`SET TRANSACTION READ ONLY` on Postgres; re-point `api/admin.py` cross-tenant reads at
the same connection.

### 3. Give background workers a tenant context — ✅ DONE (set WORKER_DB_URL)
Background jobs now use `core.database.worker_session()` (the scheduler jobs) and
`core.security.set_tenant_context(db, company_id)` per company (snapshot driver),
both no-ops on SQLite. **For activation:** set `WORKER_DB_URL` to a write-capable
**BYPASSRLS** Postgres role so the jobs can enumerate companies and write
per-company data under FORCE RLS. (Empty → plain SessionLocal, current behaviour.)

### 4. Backfill nullable `company_id`
Marketing tables (`marketing_*`) have nullable `company_id`. Backfill from the
creator's company and tighten to NOT NULL **before** applying RLS, so the policy needs
no `OR company_id IS NULL` escape hatch (which would be an isolation hole).

### 5. Create roles + repoint connections
Run `alembic/sql/rls_roles.sql` (as a superuser). Set `DATABASE_URL` to connect as
`vela_app` (NOBYPASSRLS — confirm it is NOT a superuser/owner, or FORCE RLS is moot)
and `NETWORK_DB_URL` to `vela_network_ro`.

### 6. Apply policies
The app builds tables via `create_all()` + `ensure_runtime_schema()` at boot, and
`alembic` is **not** auto-invoked. So: boot once (tables exist) → `alembic upgrade head`
(applies `0001_rls_policies`). Note `create_all` is not RLS-aware — if it ever
re-creates a dropped table the policy is lost; re-run the migration after any such event.

### 7. Verify on staging
- Session with `app.current_company_id = A` sees only A's rows; an INSERT with
  `company_id = B` is rejected by `WITH CHECK`.
- A session that never set the GUC sees **zero rows** (fail-closed), not all rows.
- The `vela_network_ro` role sees **all** companies (agent + backoffice still work).
- Temporarily remove one router's app-layer filter and confirm RLS alone still scopes.

### 8. Kill-switch
`RLS_ENABLED=false` stops the app issuing the GUC (reverts to app-layer-only scoping)
without dropping policies — emergency rollback. Full rollback: `alembic downgrade`.

## Deferred: integer → UUID primary keys (Deliverable B)

The spec also wants UUID ids (anti-enumeration). **Deferred deliberately** — it's a
multi-week, full-stack rewrite (every model PK/FK, every `/{id}` path param,
serializers, the frontend, and the SQLite dev DB). RLS closes the actual
data-exposure blocker; enumeration is mitigated far more cheaply by the shipped
hash-chained audit log + a cross-tenant→404 convention + a 404-storm anomaly detector.
Revisit only if a concrete enumeration threat materializes; do it staged (add uuid
columns → migrate FKs leaf-first → flip PKs), never big-bang.
