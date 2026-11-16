-- ============================================================
-- Migration: bids skrivelås (2026-11-12)
--
-- Kør scripts/sql/diagnose-rls.sql FØR og EFTER (nøgle 11-13). Køres i SQL
-- Editor som én transaktion. Idempotent: kan køres igen uden skade.
--
-- Samme princip som §9 i 20261018120000_pilot_security_hardening.sql:
-- klienten skriver ikke til bids. Al skrivning sker via API (service-role)
-- eller via SECURITY DEFINER-RPC'er efter eksplicit autorisation.
--
-- Lukker:
--   §1-2 Tilbudsgiver kunne via PostgREST sætte status='winner' på eget tilbud
--        eller ændre documents, tender_id, supplier_id og submitted_at — enten
--        med UPDATE ("bids_supplier_update_before_deadline" uden kolonne-
--        begrænsning) eller ved at slette og INSERT'e igen
--        ("bids_supplier_insert" uden kolonnebegrænsning).
--   §3   Tilbudsfrist og udbudsstatus blev kun håndhævet i API'et og i den nu
--        fjernede INSERT-policy. Triggeren håndhæver dem i databasen for ALLE
--        roller og stempler status + submitted_at server-side (BEK 1572:
--        dataintegritet og tidsfrister).
--   §5   Ét tilbud pr. tilbudsgiver pr. udbud var kun et ikke-atomart API-tjek.
--   §7-8 get_bid_metadata_for_tender() udleverede supplier_id og submitted_at
--        til ordregiver FØR fristen. Erstattes af et rent antal.
--
-- Bevidst uændret:
--   - "bids_supplier_delete_before_deadline" og begge SELECT-policies.
--   - update_bid_status() (SECURITY DEFINER): kører med ejerens rettigheder og
--     berøres ikke af REVOKE i §1.
--
-- Konsekvenser:
--   - En tilbudsgiver retter et tilbud ved at trække det tilbage og afgive et
--     nyt. Der findes ingen UPDATE-vej for tilbudsgiver.
--   - Insert-triggeren (§3) gælder også service-role og SQL Editor. Seed-/test-
--     data med tilbud på lukkede udbud kræver
--     ALTER TABLE public.bids DISABLE TRIGGER trg_bids_guard_insert omkring
--     indsættelsen.
--   - Unik-indekset (§5) skal erstattes af (tender_id, supplier_organisation_id)
--     i #5 bids-refactor (SCHEMA-DESIGN.md #5).
--
-- Forudsætning verificeret i live-DB 12. nov. 2026: 0 dubletter på
-- (tender_id, supplier_id); defaults status='submitted', submitted_at=now().
--
-- Rollback: se nederst (kommenteret).
-- ============================================================

BEGIN;

-- ── §1. Ingen direkte klient-skrivning ──────────────────────────────────────
-- REVOKE på tabelniveau fjerner også eventuelle kolonne-grants for samme
-- privilegium. DELETE og SELECT bevares (styres fortsat af RLS).
REVOKE INSERT, UPDATE ON public.bids FROM anon, authenticated;

-- ── §2. Policies uden funktion efter §1 ─────────────────────────────────────
DROP POLICY IF EXISTS "bids_supplier_insert"                 ON public.bids;
DROP POLICY IF EXISTS "bids_supplier_update_before_deadline" ON public.bids;

-- ── §3. Insert-vagt: frist og status håndhæves i databasen ──────────────────
-- SECURITY DEFINER + fast search_path: tjekket må ikke afhænge af kalderens
-- RLS-syn på tenders. FOR SHARE låser udbudsrækken, så en samtidig status-
-- ændring ikke kan ske mellem tjek og insert.
CREATE OR REPLACE FUNCTION public.guard_bid_insert()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status   TEXT;
  v_deadline TIMESTAMPTZ;
BEGIN
  SELECT t.status, t.submission_deadline
    INTO v_status, v_deadline
  FROM public.tenders t
  WHERE t.id = NEW.tender_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Udbuddet findes ikke'
      USING ERRCODE = '22023';
  END IF;

  IF v_status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION 'Udbuddet modtager ikke tilbud'
      USING ERRCODE = '22023';
  END IF;

  IF v_deadline IS NULL OR v_deadline <= now() THEN
    RAISE EXCEPTION 'Tilbudsfristen er udløbet'
      USING ERRCODE = '22023';
  END IF;

  -- Klienten (og API'et) bestemmer aldrig status eller afgivelsestidspunkt.
  NEW.status       := 'submitted';
  NEW.submitted_at := now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bids_guard_insert ON public.bids;
CREATE TRIGGER trg_bids_guard_insert
  BEFORE INSERT ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_bid_insert();

-- ── §4. Defaults dokumenteret i tracked migration ───────────────────────────
-- Fandtes allerede i live-DB (fra migrations_old/001). Triggeren i §3
-- overstyrer dem under alle omstændigheder.
ALTER TABLE public.bids ALTER COLUMN status       SET DEFAULT 'submitted';
ALTER TABLE public.bids ALTER COLUMN submitted_at SET DEFAULT now();

-- ── §5. Ét tilbud pr. tilbudsgiver pr. udbud ────────────────────────────────
-- Afbryd hele migrationen hvis der mod forventning findes dubletter — de skal
-- håndteres manuelt, ikke slettes automatisk.
DO $$
DECLARE
  v_dubletter INTEGER;
BEGIN
  SELECT count(*) INTO v_dubletter
  FROM (
    SELECT 1 FROM public.bids
    GROUP BY tender_id, supplier_id
    HAVING count(*) > 1
  ) d;

  IF v_dubletter > 0 THEN
    RAISE EXCEPTION
      'bids har % dublet-gruppe(r) på (tender_id, supplier_id). Ryd op manuelt og kør migrationen igen.',
      v_dubletter;
  END IF;
END;
$$;

-- Erstattes af (tender_id, supplier_organisation_id) i #5 bids-refactor.
CREATE UNIQUE INDEX IF NOT EXISTS bids_tender_supplier_unique
  ON public.bids (tender_id, supplier_id);

-- ── §6. updated_at sættes altid af databasen ────────────────────────────────
-- Legacy-triggeren update_bids_updated_at stammer fra migrations_old/001 (ikke
-- CLI-tracked) og deler funktion med andre tabeller. Erstattes af en dedikeret,
-- tracked trigger, så updated_at er garanteret uanset live-DB's historik.
CREATE OR REPLACE FUNCTION public.bids_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_bids_updated_at   ON public.bids;
DROP TRIGGER IF EXISTS trg_bids_updated_at      ON public.bids;
DROP TRIGGER IF EXISTS trg_bids_set_updated_at  ON public.bids;
CREATE TRIGGER trg_bids_set_updated_at
  BEFORE UPDATE ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION public.bids_set_updated_at();

-- ── §7. RPC: antal tilbud for ordregiver (før og efter frist) ───────────────
-- Returnerer KUN et antal — ingen identitet, tidspunkter eller status.
-- Samme organisations-tjek som den gamle metadata-RPC: ikke-medlemmer får 0.
CREATE OR REPLACE FUNCTION public.get_bid_count_for_tender(p_tender_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT count(*)::INTEGER
  FROM public.bids b
  JOIN public.tenders t ON t.id = b.tender_id
  WHERE t.id = p_tender_id
    AND t.organisation_id IN (SELECT public.get_my_organisation_ids());
$$;

REVOKE ALL ON FUNCTION public.get_bid_count_for_tender(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_bid_count_for_tender(UUID) TO authenticated, service_role;

-- ── §8. Gammel metadata-RPC lukkes for klienter ─────────────────────────────
-- Funktionen droppes ikke (bevares til evt. server-side brug via service-role),
-- men kan ikke længere kaldes via PostgREST af anon/authenticated.
REVOKE EXECUTE ON FUNCTION public.get_bid_metadata_for_tender(UUID)
  FROM PUBLIC, anon, authenticated;

COMMIT;

-- ============================================================
-- ROLLBACK (kun ved akut behov — genåbner hullerne):
-- BEGIN;
-- GRANT EXECUTE ON FUNCTION public.get_bid_metadata_for_tender(UUID) TO anon, authenticated;
-- DROP FUNCTION IF EXISTS public.get_bid_count_for_tender(UUID);
-- DROP TRIGGER IF EXISTS trg_bids_set_updated_at ON public.bids;
-- DROP FUNCTION IF EXISTS public.bids_set_updated_at();
-- CREATE TRIGGER update_bids_updated_at BEFORE UPDATE ON public.bids
--   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- DROP INDEX IF EXISTS public.bids_tender_supplier_unique;
-- DROP TRIGGER IF EXISTS trg_bids_guard_insert ON public.bids;
-- DROP FUNCTION IF EXISTS public.guard_bid_insert();
-- GRANT INSERT, UPDATE ON public.bids TO authenticated;
-- CREATE POLICY "bids_supplier_insert"
--   ON public.bids FOR INSERT TO authenticated
--   WITH CHECK (
--     supplier_id = auth.uid()
--     AND created_by = auth.uid()
--     AND EXISTS (
--       SELECT 1 FROM public.tenders t
--       WHERE t.id = tender_id
--         AND t.submission_deadline > NOW()
--         AND t.status = 'published'
--     )
--   );
-- CREATE POLICY "bids_supplier_update_before_deadline"
--   ON public.bids FOR UPDATE TO authenticated
--   USING (supplier_id = auth.uid())
--   WITH CHECK (
--     supplier_id = auth.uid()
--     AND EXISTS (
--       SELECT 1 FROM public.tenders t
--       WHERE t.id = tender_id
--         AND t.submission_deadline > NOW()
--     )
--   );
-- COMMIT;
-- (Kræver også at api/bids/route.ts rulles tilbage, hvis service-role-insert
--  ikke længere ønskes. Koden virker dog uændret efter rollback.)
-- ============================================================
