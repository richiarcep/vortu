-- Vela · staging — RLS policies for the Vera tables (Postgres). Run as the OWNER.
--
-- These ad-hoc tables carry company_id but had NO RLS policy, so the app role
-- (vela_app) had unrestricted cross-tenant access to them (AI conversations, token
-- usage, routing logs, insights, vera-plus requests, expenses). Apply the SAME
-- tenant_isolation policy every other tenant table uses (USING + WITH CHECK on
-- company_id = the GUC). The BYPASSRLS worker/network roles still see all tenants
-- (the back-office cross-tenant agent), and per-request app queries are scoped to
-- app.current_company_id (set by get_tenant_db). Idempotent.

DO $$
DECLARE
  t text;
  guc CONSTANT text := 'current_setting(''app.current_company_id'', true)::int';
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'vera_conversations','vera_token_usage','vera_insights_cache',
    'vera_routing_logs','vera_plus_requests','vera_usage_daily','expenses'
  ]
  LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON %I USING (company_id = %s) WITH CHECK (company_id = %s)',
        t, guc, guc);
    END IF;
  END LOOP;
END $$;
