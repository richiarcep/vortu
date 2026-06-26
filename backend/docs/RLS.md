# Row-Level Security (RLS) — tenant isolation

Postgres RLS enforces tenant isolation **below the app layer**: every tenant table
has a `tenant_isolation` policy `company_id = current_setting('app.current_company_id')::int`,
and the app binds that GUC per request (`get_tenant_db` / `set_tenant_context`). On
SQLite (dev) RLS doesn't exist — isolation stays app-level and all of this is a no-op.

## The three roles

| Role | Attributes | Used for | DSN |
|------|-----------|----------|-----|
| `vela` (bootstrap) | SUPERUSER | DDL + migrations only | `ADMIN_DATABASE_URL` |
| `vela_app` | NOSUPERUSER, **NOBYPASSRLS** | the web app (subject to RLS) | `DATABASE_URL` |
| `vela_network_ro` | BYPASSRLS, read-only | super-admin / network agent reads | `NETWORK_DB_URL` |
| `vela_worker` | BYPASSRLS, write | background jobs + backoffice writes | `WORKER_DB_URL` |

A SUPERUSER (or any BYPASSRLS role) **ignores RLS entirely**, even with FORCE. So the
web app MUST connect as `vela_app`, and migrations MUST run as the owner `vela`.

## Why two schema modes

`ensure_runtime_schema()` runs owner-only DDL (`DROP/CREATE INDEX`, `CREATE TRIGGER`)
at startup. `vela_app` can't run it. So:

- **Owner/build mode** — `DATABASE_URL`=owner, `MANAGE_SCHEMA=true`: builds the schema.
- **Runtime mode** — `DATABASE_URL`=vela_app, `MANAGE_SCHEMA=false`: serves traffic;
  schema is built/migrated out-of-band by the owner.

`main.py` `_rls_preflight()` refuses to boot in runtime mode if the role is privileged
(RLS would be bypassed) or if `WORKER_DB_URL`/`NETWORK_DB_URL` are unset (cross-tenant
jobs/backoffice would silently return 0 rows).

## Activation runbook (staging)

0. **Merge the code** (this branch): tenant-table coverage, owner-bound `alembic/env.py`,
   raw fiscal/finance tables on the boot path, missed-GUC fixes, `_rls_preflight`.
1. **Provision roles** — `deploy/postgres-init/10-roles.sh` runs on first DB init (or run
   `alembic/sql/rls_roles.sql` as the owner). Verify `vela_app` is `rolsuper=f, rolbypassrls=f`.
2. **Build schema as owner** — boot once with `DATABASE_URL`=owner + `MANAGE_SCHEMA=true`
   (or run a one-off), so every tenant table from `all_tenant_tables()` exists, owned by `vela`.
3. **Apply RLS as owner** — `ADMIN_DATABASE_URL=<owner> alembic upgrade head`. Verify:
   `SELECT tablename,policyname FROM pg_policies` lists `tenant_isolation` on every tenant table + `companies`.
4. **Seed 2 test tenants** (A=1, B=2) with a few products/sales/snapshots each.
5. **Validate isolation as `vela_app`** (psql):
   - GUC unset → `SELECT count(*) FROM products` = **0** (fail-closed).
   - `set_config('app.current_company_id','1',true)` → only company 1's rows; repeat '2'.
   - WITH CHECK: GUC='1', `INSERT ... company_id=2` → **rejected**.
6. **Validate bypass roles** — `vela_network_ro` sees all tenants (read); `vela_worker` can write any.
7. **Switch the app `.env`**: `DATABASE_URL`=vela_app, `MANAGE_SCHEMA=false`, `RLS_ENABLED=true`,
   `NETWORK_DB_URL`=vela_network_ro, `WORKER_DB_URL`=vela_worker. **Do not** put `ADMIN_DATABASE_URL` in the web tier.
8. **Recreate** the app container. Logs should show `MANAGE_SCHEMA=false → skipping startup DDL`
   and `RLS preflight OK`.
9. **Smoke test** as tenant A then B: login, list/create a product, POS sale + refund, document
   upload→confirm, GDPR export/erase, fiscal/finance reads, a Stripe sandbox POS webhook, the
   superadmin backoffice (non-empty), and the scheduler jobs. Tenant A must never see B's data.

## Rollback

- **Kill-switch (fastest):** set `RLS_ENABLED=false` (and `DATABASE_URL` back to the owner),
  recreate. Policies stay in place but the GUC wiring is off and the owner bypasses RLS.
- **Remove policies:** `ADMIN_DATABASE_URL=<owner> alembic downgrade -1` (drops every policy
  + NO FORCE + DISABLE). Verify `SELECT count(*) FROM pg_policies WHERE policyname='tenant_isolation'` = 0.

## Residual risks / CI guards to add

- A new `Depends(get_db)` on a tenant endpoint silently returns 0 rows — add a 2-tenant
  integration test that asserts each router returns only its own rows (and 0 with GUC unset).
- `RAW_TENANT_TABLES` is hand-maintained — add a CI assert that every live table with a
  `company_id` column is in `all_tenant_tables()` AND has a policy in `pg_policies`.
- `commit()` mid-request drops the transaction-local GUC — audit multi-commit flows.
