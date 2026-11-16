-- ============================================================
-- schema-fingerprint.sql — READ-ONLY. Ændrer intet.
--
-- Dækker det, som baseline-dumpet (pg_dump af skema public) IKKE viser, og
-- som derfor kan afvige mellem produktion og en database bygget fra
-- supabase/migrations/20261116120000_baseline_prod.sql.
--
-- Kør i Supabase Dashboard → SQL Editor på begge databaser og sammenlign.
-- Returnerer ÉN række med ét JSON-felt ("fingerprint"), som diagnose-rls.sql.
-- Gem output i scripts/sql/output/ (git-ignoreret): nøgle 9 (cron.job) kan
-- indeholde URL'er og nøgler fra job-kommandoer.
-- ============================================================

-- Alle objekter i public med ejer (bruges af nøgle 7).
WITH o AS (
  SELECT CASE c.relkind WHEN 'r' THEN 'tabel' WHEN 'p' THEN 'tabel' WHEN 'v' THEN 'view'
                        WHEN 'm' THEN 'matview' WHEN 'S' THEN 'sekvens' ELSE 'fremmedtabel' END AS slags,
         c.relname::text AS objekt, pg_get_userbyid(c.relowner)::text AS ejer
  FROM pg_class c
  WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
  UNION ALL
  SELECT 'funktion', p.oid::regprocedure::text, pg_get_userbyid(p.proowner)::text
  FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
  UNION ALL
  SELECT 'type', t.typname::text, pg_get_userbyid(t.typowner)::text
  FROM pg_type t WHERE t.typnamespace = 'public'::regnamespace AND t.typtype IN ('e', 'd')
  UNION ALL
  SELECT 'skema', n.nspname::text, pg_get_userbyid(n.nspowner)::text
  FROM pg_namespace n WHERE n.nspname = 'public'
)
SELECT jsonb_pretty(jsonb_build_object(

  -- 0. Hvor og som hvem
  '0_meta', jsonb_build_object(
    'server_version', current_setting('server_version'),
    'database', current_database(),
    'bruger', current_user
  ),

  -- 1. Triggere på tabeller i auth og storage
  '1_triggere_auth_storage', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'tabel', n.nspname || '.' || c.relname,
      'trigger', t.tgname,
      'aktiv', t.tgenabled <> 'D',
      'definition', pg_get_triggerdef(t.oid)
    ) ORDER BY n.nspname, c.relname, t.tgname), '[]'::jsonb)
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('auth', 'storage') AND NOT t.tgisinternal
  ),

  -- 2. Policies i storage (forventet: ingen — al adgang går via service-role)
  '2_storage_policies', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'tabel', schemaname || '.' || tablename, 'policy', policyname, 'cmd', cmd,
      'roller', roles, 'using', qual, 'with_check', with_check
    ) ORDER BY tablename, cmd, policyname), '[]'::jsonb)
    FROM pg_policies WHERE schemaname = 'storage'
  ),

  -- 3. Buckets med alle indstillinger (uden tidsstempler, så output kan sammenlignes)
  '3_buckets', (
    SELECT coalesce(jsonb_agg(to_jsonb(b) - 'created_at' - 'updated_at' ORDER BY b.id), '[]'::jsonb)
    FROM storage.buckets b
  ),

  -- 4. Extensions med version og skema
  '4_extensions', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'extension', e.extname, 'version', e.extversion, 'skema', n.nspname
    ) ORDER BY e.extname), '[]'::jsonb)
    FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
  ),

  -- 5. Publikationer og deres tabeller (Realtime)
  '5_publikationer', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'publikation', p.pubname,
      'ejer', pg_get_userbyid(p.pubowner),
      'alle_tabeller', p.puballtables,
      'insert', p.pubinsert, 'update', p.pubupdate,
      'delete', p.pubdelete, 'truncate', p.pubtruncate,
      'tabeller', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'tabel', pt.schemaname || '.' || pt.tablename,
          'kolonner', pt.attnames,
          'raekkefilter', pt.rowfilter
        ) ORDER BY pt.schemaname, pt.tablename), '[]'::jsonb)
        FROM pg_publication_tables pt WHERE pt.pubname = p.pubname
      )
    ) ORDER BY p.pubname), '[]'::jsonb)
    FROM pg_publication p
  ),

  -- 6. Default ACLs (alle roller og skemaer). objekttype: r = tabeller,
  --    S = sekvenser, f = funktioner, T = typer, n = skemaer.
  '6_default_acls', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'rolle', pg_get_userbyid(d.defaclrole),
      'skema', n.nspname,
      'objekttype', d.defaclobjtype,
      'acl', d.defaclacl::text[]
    ) ORDER BY pg_get_userbyid(d.defaclrole), n.nspname, d.defaclobjtype), '[]'::jsonb)
    FROM pg_default_acl d
    LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
  ),

  -- 7. Objekt-ejere i public (forventet: alt ejes af postgres; skemaet selv
  --    af pg_database_owner)
  '7_ejere_public', jsonb_build_object(
      'antal_pr_ejer', (
        SELECT coalesce(jsonb_object_agg(ejer, antal), '{}'::jsonb)
        FROM (SELECT o.ejer, count(*) AS antal FROM o GROUP BY o.ejer) g
      ),
      'ikke_postgres', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'slags', o.slags, 'objekt', o.objekt, 'ejer', o.ejer
        ) ORDER BY o.slags, o.objekt), '[]'::jsonb)
        FROM o WHERE o.ejer <> 'postgres'
      ),
      'alle', (
        SELECT coalesce(jsonb_agg(o.slags || ' ' || o.objekt || ' → ' || o.ejer
                                  ORDER BY o.slags, o.objekt), '[]'::jsonb)
        FROM o
      )
  ),

  -- 8. Event triggers (fjernet fra baseline; platformen ejer dem)
  '8_event_triggers', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'trigger', e.evtname, 'event', e.evtevent,
      'ejer', pg_get_userbyid(e.evtowner),
      'funktion', e.evtfoid::regprocedure::text,
      'aktiv', e.evtenabled <> 'D', 'tags', e.evttags
    ) ORDER BY e.evtname), '[]'::jsonb)
    FROM pg_event_trigger e
  ),

  -- 9. cron.job, hvis pg_cron er installeret. Tabellen kan ikke nævnes direkte,
  --    når skemaet mangler, så den læses via query_to_xml (ren SELECT) og
  --    hex-kodes for at undgå XML-escaping. null = cron.job findes ikke.
  '9_cron_jobs', (
    SELECT CASE
      WHEN to_regclass('cron.job') IS NULL THEN NULL
      ELSE convert_from(decode(
        (xpath('/row/j/text()', query_to_xml(
          'SELECT encode(convert_to(coalesce(jsonb_agg(to_jsonb(j) ORDER BY j.jobid), ''[]''::jsonb)::text, ''UTF8''), ''hex'') AS j FROM cron.job j',
          false, true, ''
        )))[1]::text,
        'hex'), 'UTF8')::jsonb
    END
  )

)) AS fingerprint;
