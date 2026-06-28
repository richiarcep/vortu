-- Vela · staging — out-of-band security/runtime schema (Postgres).
--
-- WHY THIS FILE EXISTS:
--   On staging the app connects as the NON-OWNER, NON-BYPASSRLS role `vela_app`,
--   so MANAGE_SCHEMA=false and the app SKIPS ensure_runtime_schema() at startup
--   (a non-owner role can't run CREATE/ALTER). These objects must therefore be
--   created out-of-band by the schema OWNER. This mirrors exactly what
--   core/database.py:ensure_runtime_schema() creates for the security features.
--
-- HOW TO RUN (on the server, as the Postgres OWNER/superuser — NOT vela_app):
--   cd /opt/vela-backend
--   set -a && . ./.env && set +a
--   docker compose -f docker-compose.staging.yml exec -T postgres \
--     psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 \
--     < alembic/sql/staging_security_schema.sql
--
-- Fully IDEMPOTENT (IF NOT EXISTS everywhere): safe to run more than once.

BEGIN;

-- ── Tamper-evident security audit log (threats console + login/2FA/impersonation audit) ──
CREATE TABLE IF NOT EXISTS security_audit_log (
    id SERIAL PRIMARY KEY,
    ts TEXT NOT NULL,
    event TEXT NOT NULL,
    actor_user_id INTEGER,
    actor_email TEXT,
    target TEXT,
    company_id INTEGER,
    ip TEXT,
    user_agent TEXT,
    detail TEXT,
    prev_hash TEXT,
    row_hash TEXT
);
CREATE INDEX IF NOT EXISTS ix_audit_event ON security_audit_log (event);
CREATE INDEX IF NOT EXISTS ix_audit_actor ON security_audit_log (actor_email);
CREATE INDEX IF NOT EXISTS ix_audit_ts ON security_audit_log (ts);

-- ── Rotating, revocable refresh tokens (login session continuity) ──
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    jti TEXT UNIQUE NOT NULL,
    family_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    token_version INTEGER NOT NULL DEFAULT 0,
    issued_at TEXT,
    expires_at TEXT,
    revoked INTEGER NOT NULL DEFAULT 0,
    revoked_at TEXT,
    revoked_reason TEXT,
    replaced_by_jti TEXT,
    ip TEXT,
    user_agent TEXT
);
CREATE INDEX IF NOT EXISTS ix_refresh_user ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS ix_refresh_family ON refresh_tokens (family_id);
CREATE INDEX IF NOT EXISTS ix_refresh_hash ON refresh_tokens (token_hash);

-- ── Admin impersonation sessions (audited, time-boxed, revocable) ──
CREATE TABLE IF NOT EXISTS impersonation_session (
    id SERIAL PRIMARY KEY,
    jti TEXT UNIQUE,
    admin_user_id INTEGER,
    target_user_id INTEGER,
    company_id INTEGER,
    reason TEXT,
    mode TEXT DEFAULT 'read',
    issued_at TEXT,
    expires_at TEXT,
    revoked_at TEXT,
    ended_at TEXT,
    ip TEXT,
    user_agent TEXT
);
CREATE INDEX IF NOT EXISTS ix_impersonation_admin ON impersonation_session (admin_user_id);
CREATE INDEX IF NOT EXISTS ix_impersonation_target ON impersonation_session (target_user_id);

-- ── Single-use, hashed verification tokens (email verification / password reset) ──
CREATE TABLE IF NOT EXISTS verification_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    token_hash TEXT,
    purpose TEXT DEFAULT 'email_verify',
    expires_at TEXT,
    used_at TEXT,
    created_at TEXT
);
CREATE INDEX IF NOT EXISTS ix_verification_tokens_user ON verification_tokens (user_id);
CREATE INDEX IF NOT EXISTS ix_verification_tokens_hash ON verification_tokens (token_hash);

-- ── users: new security columns (idempotent ADD COLUMN IF NOT EXISTS) ──
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN DEFAULT FALSE;

-- Backfill: every EXISTING account (demos + operator) counts as verified, so the
-- new login gate never locks out anyone who signed up before email verification.
-- Only brand-new self-signups (FALSE) will be required to verify their email.
UPDATE users SET email_verified = TRUE WHERE email_verified IS NOT TRUE;

-- ── GRANTs: the app role (vela_app) + worker role (vela_worker) must reach the
-- new tables/sequences under RLS. Guarded so a missing role doesn't abort. This
-- re-applies the same blanket grant the rls_roles.sql bootstrap uses. ──
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'vela_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vela_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vela_app;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'vela_worker') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vela_worker;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vela_worker;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'vela_network_ro') THEN
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO vela_network_ro;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vela_network_ro;
  END IF;
END $$;

COMMIT;

-- Quick sanity check after running (should list all four tables):
--   \dt security_audit_log
--   \dt impersonation_session
--   \dt verification_tokens
--   \d users   -- confirm token_version / email_verified / role / is_test_account
