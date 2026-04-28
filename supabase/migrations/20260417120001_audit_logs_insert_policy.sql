-- ============================================================
-- Tilføj INSERT-policy til audit_logs for service_role.
--
-- audit_logs-tabellen har SELECT-policies for brugere (se migration
-- migrations_old/008_audit_logs.sql), men manglede en INSERT-policy.
-- Al audit-logning sker server-side via service role — aldrig direkte
-- fra klient. Brugere har aldrig direkte skriveadgang til audit_logs.
--
-- SECURITY DEFINER-triggerfunktioner (fx fra organisations-migration)
-- kører som funktionsejer og omgår RLS, men service_role-kald fra
-- applikationslaget (via serviceKey) kræver en eksplicit policy.
-- ============================================================

DROP POLICY IF EXISTS "service_role_insert_audit" ON public.audit_logs;

CREATE POLICY "service_role_insert_audit"
  ON public.audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);
