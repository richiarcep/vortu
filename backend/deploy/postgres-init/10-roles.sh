#!/bin/bash
# Runs ONCE, on first Postgres init, as the bootstrap superuser ($POSTGRES_USER).
# Creates the three Vela RLS roles from env-provided passwords and sets default
# privileges so tables the app (owner) later creates are granted to them.
# Idempotent (CREATE only if the role is missing). No passwords are hardcoded —
# they come from the compose env.
#
#   vela_app         — the app role. NOSUPERUSER, NOBYPASSRLS → subject to RLS.
#   vela_network_ro  — cross-tenant agent/backoffice. BYPASSRLS, read-only.
#   vela_worker      — background jobs. BYPASSRLS, write (enumerate + write all tenants).
#
# RLS itself is applied LATER (alembic 0001_rls_policies) — see docs/RLS.md. This
# only provisions the roles so activation is a one-step switch.
set -euo pipefail

: "${VELA_APP_PASSWORD:?VELA_APP_PASSWORD not set}"
: "${VELA_NETWORK_RO_PASSWORD:?VELA_NETWORK_RO_PASSWORD not set}"
: "${VELA_WORKER_PASSWORD:?VELA_WORKER_PASSWORD not set}"

# Note: :'var' renders a safely-quoted string literal; \gexec runs the SELECTed
# DDL only when the role does not already exist. (We avoid DO blocks because psql
# does not interpolate :vars inside dollar-quoted bodies.)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
     -v dbname="$POSTGRES_DB" \
     -v app_pw="$VELA_APP_PASSWORD" \
     -v ro_pw="$VELA_NETWORK_RO_PASSWORD" \
     -v worker_pw="$VELA_WORKER_PASSWORD" <<-'SQL'
	SELECT format('CREATE ROLE vela_app LOGIN PASSWORD %L NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE', :'app_pw')
	  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vela_app')
	\gexec

	SELECT format('CREATE ROLE vela_network_ro LOGIN PASSWORD %L NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE', :'ro_pw')
	  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vela_network_ro')
	\gexec

	SELECT format('CREATE ROLE vela_worker LOGIN PASSWORD %L NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE', :'worker_pw')
	  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vela_worker')
	\gexec

	GRANT CONNECT ON DATABASE :"dbname" TO vela_app, vela_network_ro, vela_worker;
	GRANT USAGE ON SCHEMA public TO vela_app, vela_network_ro, vela_worker;

	-- Tables that already exist (none on first init, but safe to re-run).
	GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vela_app, vela_worker;
	GRANT SELECT ON ALL TABLES IN SCHEMA public TO vela_network_ro;
	GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vela_app, vela_worker;

	-- Tables the bootstrap owner ($POSTGRES_USER) creates later (the app's startup
	-- schema build) are auto-granted to the roles.
	ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vela_app, vela_worker;
	ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO vela_network_ro;
	ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO vela_app, vela_worker;
SQL

echo "[vela] RLS roles ready: vela_app, vela_network_ro, vela_worker"
