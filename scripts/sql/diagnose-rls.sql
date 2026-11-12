-- ============================================================
-- diagnose-rls.sql — READ-ONLY. Ændrer intet.
--
-- Kør i Supabase Dashboard → SQL Editor FØR og EFTER sikkerhedsmigrationer
-- (20261018120000_pilot_security_hardening.sql; nøgle 11-13 hører til
-- 20261112120000_bids_column_lock.sql).
-- Returnerer ÉN række med ét JSON-felt ("rapport"), fordi SQL Editor kun
-- viser resultatet af sidste statement. Kopiér hele feltet og gem det.
-- ============================================================

SELECT jsonb_pretty(jsonb_build_object(

  -- 1. Alle policies på public + storage
  '1_policies', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'tabel', schemaname || '.' || tablename, 'policy', policyname, 'cmd', cmd,
      'roller', roles, 'using', qual, 'with_check', with_check
    ) ORDER BY schemaname, tablename, cmd, policyname), '[]'::jsonb)
    FROM pg_policies WHERE schemaname IN ('public', 'storage')
  ),

  -- 2. Røde flag: policies for anon/public med USING (true) eller uden betingelse
  '2_roede_flag', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'tabel', schemaname || '.' || tablename, 'policy', policyname, 'cmd', cmd, 'roller', roles
    )), '[]'::jsonb)
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
      AND (roles && ARRAY['public','anon']::name[])
      AND (qual IS NULL OR qual = 'true')
      AND cmd <> 'INSERT'
  ),

  -- 3. Tabeller i public uden RLS (skal være tom)
  '3_tabeller_uden_rls', (
    SELECT coalesce(jsonb_agg(c.relname), '[]'::jsonb)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
  ),

  -- 4. Storage-buckets (alle skal være public = false)
  '4_buckets', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'public', public) ORDER BY id), '[]'::jsonb)
    FROM storage.buckets
  ),

  -- 5. Kolonne-rettigheder på tender_questions for anon/authenticated
  '5_qna_kolonner', (
    SELECT coalesce(jsonb_agg(DISTINCT grantee || ':' || column_name), '[]'::jsonb)
    FROM information_schema.column_privileges
    WHERE table_schema = 'public' AND table_name = 'tender_questions'
      AND grantee IN ('anon', 'authenticated') AND privilege_type = 'SELECT'
  ),

  -- 6. Udbud uden organisation_id
  '6_udbud_uden_org', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'titel', title, 'status', status, 'entity_id', entity_id
    )), '[]'::jsonb)
    FROM public.tenders WHERE organisation_id IS NULL
  ),

  -- 7. Statusværdier i brug
  '7_statusser', (
    SELECT coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
    FROM (SELECT status, count(*) AS n FROM public.tenders GROUP BY status) s
  ),

  -- 8. Audit-rækker med tilbudspriser (skal være 0 efter migration)
  '8_audit_med_priser', (
    SELECT count(*) FROM public.audit_logs
    WHERE metadata ? 'amount' OR metadata ? 'currency'
  ),

  -- 9. Brugere og organisations-medlemskab
  '9_brugere', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'user_id', p.id, 'navn', p.full_name, 'active_role', p.active_role,
      'organisation_id', m.organisation_id, 'organisation', o.name,
      'medlemsrolle', m.role, 'accepteret', m.accepted_at IS NOT NULL
    )), '[]'::jsonb)
    FROM public.profiles p
    LEFT JOIN public.organisation_members m ON m.profile_id = p.id
    LEFT JOIN public.organisations o ON o.id = m.organisation_id
  ),

  -- 10. Gyldige organisationstyper (til seed-scriptet)
  '10_organisationstyper', (
    SELECT coalesce(jsonb_agg(code), '[]'::jsonb) FROM public.organisation_types
  ),

  -- 11. bids: klient-skriveprivilegier (alle skal være false efter migration
  --     20261112120000). has_any_column_privilege dækker både tabel- og
  --     kolonneniveau; has_table_privilege viser tabelniveau alene.
  '11_bids_skriveprivilegier', (
    SELECT jsonb_object_agg(
      r.rolle || ':' || p.priv,
      jsonb_build_object(
        'tabel',   has_table_privilege(r.rolle::name, 'public.bids', p.priv),
        'kolonne', has_any_column_privilege(r.rolle::name, 'public.bids', p.priv)
      )
    )
    FROM (VALUES ('anon'), ('authenticated')) AS r(rolle)
    CROSS JOIN (VALUES ('INSERT'), ('UPDATE')) AS p(priv)
  ),

  -- 12. bids-RPC'er: EXECUTE for klient-roller. Forventet efter migration:
  --     gammel_metadata:* = false, ny_count:anon = false,
  --     ny_count:authenticated = true. null = funktionen findes ikke (endnu).
  '12_bids_rpc_execute', (
    SELECT jsonb_object_agg(
      f.navn || ':' || r.rolle,
      has_function_privilege(r.rolle::name, to_regprocedure(f.signatur)::oid, 'EXECUTE')
    )
    FROM (VALUES
      ('gammel_metadata', 'public.get_bid_metadata_for_tender(uuid)'),
      ('ny_count',        'public.get_bid_count_for_tender(uuid)')
    ) AS f(navn, signatur)
    CROSS JOIN (VALUES ('anon'), ('authenticated')) AS r(rolle)
  ),

  -- 13. bids: triggere og indeks. Forventet efter migration: triggerne
  --     trg_bids_guard_insert (BEFORE INSERT), trg_bids_set_updated_at og
  --     audit_bids — og IKKE update_bids_updated_at; indekset
  --     bids_tender_supplier_unique (UNIQUE på tender_id, supplier_id).
  '13_bids_triggere_og_indeks', jsonb_build_object(
    'triggere', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'trigger', t.tgname,
        'aktiv', t.tgenabled <> 'D',
        'definition', pg_get_triggerdef(t.oid)
      ) ORDER BY t.tgname), '[]'::jsonb)
      FROM pg_trigger t
      WHERE t.tgrelid = 'public.bids'::regclass AND NOT t.tgisinternal
    ),
    'indeks', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'indeks', indexname, 'definition', indexdef
      ) ORDER BY indexname), '[]'::jsonb)
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'bids'
    )
  )

)) AS rapport;
