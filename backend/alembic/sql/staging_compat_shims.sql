-- Vela · staging — SQLite-compat function shims (Postgres). Run as the OWNER.
--
-- The app embeds SQLite's datetime('now') / datetime('now','-7 days') /
-- date('now','start of year') in ~27 inline raw-SQL queries (analytics filters,
-- updated_at stamps, quota windows). SQLite has these built in; Postgres does NOT,
-- so those queries 500 with "function datetime(unknown) does not exist". Rather
-- than rewrite 27 live queries, define matching functions in Postgres so the SQL
-- runs UNCHANGED. The app stores timestamps as ISO TEXT, so these return TEXT in
-- the same shape the code reads back (datetime.fromisoformat / lexical date compare).
-- Robust: an unparseable modifier falls back to "now" instead of erroring.
-- Reversible: DROP FUNCTION datetime(text,text); DROP FUNCTION date(text,text);
-- (The proper long-term fix is to remove the SQLite-isms from the code; this shim
--  unblocks staging without touching the query layer.)
--
--   docker compose -f docker-compose.staging.yml exec -T postgres \
--     psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 \
--     < alembic/sql/staging_compat_shims.sql

-- datetime('now')  and  datetime('now', '-7 days')  → ISO text 'YYYY-MM-DDTHH:MM:SS'
CREATE OR REPLACE FUNCTION datetime(arg1 text, arg2 text DEFAULT NULL)
RETURNS text AS $$
DECLARE ivl interval := INTERVAL '0';
BEGIN
  IF arg2 IS NOT NULL AND arg2 <> '' THEN
    BEGIN ivl := arg2::interval; EXCEPTION WHEN OTHERS THEN ivl := INTERVAL '0'; END;
  END IF;
  RETURN to_char((now() AT TIME ZONE 'UTC') + ivl, 'YYYY-MM-DD"T"HH24:MI:SS');
END;
$$ LANGUAGE plpgsql STABLE;

-- date('now', 'start of year')  and  date('now', '-30 days')  → text 'YYYY-MM-DD'
-- (2-arg signature only — does NOT shadow Postgres's 1-arg date(timestamp) cast.)
CREATE OR REPLACE FUNCTION date(arg1 text, arg2 text)
RETURNS text AS $$
DECLARE base timestamp := now() AT TIME ZONE 'UTC';
BEGIN
  IF arg2 = 'start of year' THEN
    RETURN to_char(date_trunc('year', base), 'YYYY-MM-DD');
  ELSIF arg2 = 'start of month' THEN
    RETURN to_char(date_trunc('month', base), 'YYYY-MM-DD');
  END IF;
  BEGIN
    RETURN to_char(base + arg2::interval, 'YYYY-MM-DD');
  EXCEPTION WHEN OTHERS THEN
    RETURN to_char(base, 'YYYY-MM-DD');
  END;
END;
$$ LANGUAGE plpgsql STABLE;

-- Let the RLS app/worker roles execute the shims.
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'vela_app') THEN
    GRANT EXECUTE ON FUNCTION datetime(text, text) TO vela_app;
    GRANT EXECUTE ON FUNCTION date(text, text) TO vela_app;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'vela_worker') THEN
    GRANT EXECUTE ON FUNCTION datetime(text, text) TO vela_worker;
    GRANT EXECUTE ON FUNCTION date(text, text) TO vela_worker;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'vela_network_ro') THEN
    GRANT EXECUTE ON FUNCTION datetime(text, text) TO vela_network_ro;
    GRANT EXECUTE ON FUNCTION date(text, text) TO vela_network_ro;
  END IF;
END $$;
