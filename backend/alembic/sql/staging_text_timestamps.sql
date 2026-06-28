-- Vela · staging — make the Vera tables' timestamp columns TEXT (Postgres). OWNER.
--
-- staging_vera_schema.sql created vera_routing_*/vera_models_config/vera_conversations/
-- vera_messages with TIMESTAMP columns, but the whole app stores + compares timestamps
-- as ISO TEXT (and the datetime('now') compat shim returns TEXT). So
--   WHERE created_at(timestamp) > datetime('now','-7 days')(text)   → "operator does not exist"
--   UPDATE ... SET updated_at(timestamp) = datetime('now')(text)    → type-mismatch
-- Convert those columns to TEXT (ISO-format) so everything is uniformly TEXT.
-- Data-safe (USING to_char). Idempotent-ish: re-running on an already-TEXT column is a
-- no-op cast. Run after staging_vera_schema.sql + staging_compat_shims.sql.

BEGIN;

DO $$
DECLARE
  r RECORD;
  iso CONSTANT text := 'YYYY-MM-DD"T"HH24:MI:SS';
BEGIN
  FOR r IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('timestamp without time zone', 'timestamp with time zone')
      AND table_name IN ('vera_routing_logs','vera_routing_rules','vera_models_config',
                         'vera_conversations','vera_messages','vera_usage_daily')
  LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP DEFAULT', r.table_name, r.column_name);
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN %I TYPE TEXT USING (CASE WHEN %I IS NULL THEN NULL ELSE to_char(%I, %L) END)',
      r.table_name, r.column_name, r.column_name, r.column_name, iso);
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN %I SET DEFAULT to_char((now() AT TIME ZONE %L), %L)',
      r.table_name, r.column_name, 'UTC', iso);
  END LOOP;
END $$;

COMMIT;
