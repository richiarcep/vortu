-- RLS role setup (Postgres, run once by a superuser/owner on staging then prod).
-- RLS is ineffective if the app connects as a SUPERUSER or the table OWNER without
-- FORCE; the app MUST connect as a NON-SUPERUSER, NON-BYPASSRLS role.
--
-- Replace passwords + DBNAME before running. See docs/RLS.md.

-- 1) Application role: subject to RLS. The app's DATABASE_URL connects as this.
CREATE ROLE vela_app LOGIN PASSWORD 'CHANGE_ME' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
GRANT CONNECT ON DATABASE DBNAME TO vela_app;
GRANT USAGE ON SCHEMA public TO vela_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vela_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vela_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vela_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO vela_app;

-- 2) Cross-tenant read-only role for the super-admin network agent + backoffice.
--    BYPASSRLS so it can legitimately read every tenant; read-only for safety.
CREATE ROLE vela_network_ro LOGIN PASSWORD 'CHANGE_ME' NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE;
GRANT CONNECT ON DATABASE DBNAME TO vela_network_ro;
GRANT USAGE ON SCHEMA public TO vela_network_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO vela_network_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO vela_network_ro;

-- After this: set DATABASE_URL to connect as vela_app, and NETWORK_DB_URL to
-- connect as vela_network_ro, then run `alembic upgrade head` to apply policies.
