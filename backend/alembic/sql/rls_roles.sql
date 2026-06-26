-- RLS role setup — MANUAL path (e.g. a managed Postgres like Neon, where you
-- can't use the docker postgres-init script). Idempotent; passwords come from
-- psql variables so nothing is hardcoded. Run once as a superuser/owner:
--
--   psql "$ADMIN_DATABASE_URL" \
--     -v dbname=vela \
--     -v app_pw='...' -v ro_pw='...' -v worker_pw='...' \
--     -f alembic/sql/rls_roles.sql
--
-- RLS is ineffective if the app connects as a SUPERUSER or as the table OWNER
-- without FORCE — the app MUST connect as vela_app (NOSUPERUSER, NOBYPASSRLS).
-- After this, set DATABASE_URL→vela_app, NETWORK_DB_URL→vela_network_ro,
-- WORKER_DB_URL→vela_worker, then `alembic upgrade head` to apply the policies.

-- 1) Application role — subject to RLS.
SELECT format('CREATE ROLE vela_app LOGIN PASSWORD %L NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE', :'app_pw')
  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vela_app')
\gexec

-- 2) Cross-tenant READ-ONLY role for the super-admin network agent + backoffice.
SELECT format('CREATE ROLE vela_network_ro LOGIN PASSWORD %L NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE', :'ro_pw')
  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vela_network_ro')
\gexec

-- 3) Cross-tenant WRITE role for background jobs (enumerate + write all tenants).
SELECT format('CREATE ROLE vela_worker LOGIN PASSWORD %L NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE', :'worker_pw')
  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vela_worker')
\gexec

GRANT CONNECT ON DATABASE :"dbname" TO vela_app, vela_network_ro, vela_worker;
GRANT USAGE ON SCHEMA public TO vela_app, vela_network_ro, vela_worker;

-- Existing tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vela_app, vela_worker;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO vela_network_ro;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vela_app, vela_worker;

-- Future tables (created by the role running this script).
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vela_app, vela_worker;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO vela_network_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO vela_app, vela_worker;
