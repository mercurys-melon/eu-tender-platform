-- ============================================================
-- Migration: bids RLS-konsolidering efter sikkerhedsaudit 2026-04-28
--
-- Baggrund:
--   Audit identificerede at bids-tabellen havde en 'read bids'-policy med
--   USING (true), som eksponerede alle tilbudsdata (inkl. pris og leverandør-
--   identitet) til alle brugere inkl. anon. Denne policy blev droppet manuelt
--   i Supabase Studio inden denne migration.
--
--   Derudover manglede en UPDATE-policy for buyers, som betød at
--   evalueringsmodulet var ikke-funktionelt i produktion.
--
-- Forudsætninger ved migration-tidspunkt:
--   - bids-tabellen var TOM (COUNT = 0). Ingen produktionsdata berøres.
--   - suppliers-tabellen eksisterer ikke; bids.supplier_id FK droppes.
--   - evaluation_notes-kolonnen droppes — evaluering håndteres ikke i
--     bids-tabellen i den nye model.
--
-- Ny model:
--   - Suppliers identificeres via auth.uid() direkte (supplier_id = UUID fra
--     auth.users). Koblingen til supplier-organisations-model tilføjes i
--     fremtidig migration når organisations-RBAC er fuldt implementeret.
--   - Buyers' bid-adgang er deadline-gated: fulde detaljer kun efter frist.
--   - Buyer-statusopdatering sker udelukkende via update_bid_status() RPC.
--   - Pre-deadline metadata (hvem har afgivet og hvornår) eksponeres via
--     get_bid_metadata_for_tender() RPC.
--
-- Reference: Audit gennemført 2026-04-28, session eu-tender-platform.
-- ============================================================


-- ── §2. DROP eksisterende policies ───────────────────────────────────────────
-- Rydder alle kendte policies — inkl. dem fra migrations_old og den
-- manuelt droppede 'read bids', som guards imod eventuel genskabelse.

DROP POLICY IF EXISTS "insert own bids"                          ON public.bids;
DROP POLICY IF EXISTS "update own bids"                          ON public.bids;
DROP POLICY IF EXISTS "Bids are viewable by owner and tender entity" ON public.bids;
DROP POLICY IF EXISTS "Bids are insertable by authenticated suppliers" ON public.bids;
DROP POLICY IF EXISTS "Bids are updatable by owner"              ON public.bids;
DROP POLICY IF EXISTS "read bids"                                ON public.bids;


-- ── §3. DROP foreign key til suppliers ───────────────────────────────────────
-- suppliers-tabellen eksisterer ikke. FK'en ville blokere inserts.

ALTER TABLE public.bids DROP CONSTRAINT IF EXISTS bids_supplier_id_fkey;


-- ── §3b. ADD foreign key til auth.users ──────────────────────────────────────
-- supplier_id er nu en direkte reference til auth.users.id (i stedet for til
-- den ikke-eksisterende suppliers-tabel). FK'en sikrer type-integritet og
-- automatisk cascade-rens hvis brugeren slettes fra auth.
-- Senere migration der introducerer supplier-organisations-modellen vil drop'e
-- denne FK og erstatte med reference til organisations-tabellen.

ALTER TABLE public.bids
  ADD CONSTRAINT bids_supplier_id_fkey
  FOREIGN KEY (supplier_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- ── §4. DROP evaluation_notes ─────────────────────────────────────────────────
-- Evaluering håndteres ikke i bids-tabellen i ny model.
-- Buyer-statusopdatering sker via update_bid_status() RPC (§11).

ALTER TABLE public.bids DROP COLUMN IF EXISTS evaluation_notes;


-- ── §5. ADD created_by ────────────────────────────────────────────────────────
-- created_by adskilt fra supplier_id for at give audit-spor af hvilken person
-- der oprettede bidet, uafhængigt af hvilken supplier-organisation det er
-- afgivet på vegne af.

ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bids_created_by ON public.bids(created_by);


-- ── §6. SELECT-policy for supplier ────────────────────────────────────────────
-- Suppliers kan altid se egne bids (alle statusser, før og efter deadline).

DROP POLICY IF EXISTS "bids_supplier_select_own" ON public.bids;
CREATE POLICY "bids_supplier_select_own"
  ON public.bids FOR SELECT TO authenticated
  USING (supplier_id = auth.uid());


-- ── §7. SELECT-policy for buyer ───────────────────────────────────────────────
-- Buyer kan se fulde bid-detaljer EFTER tilbudsfristens udløb, kun for tenders
-- i organisationer hvor brugeren er medlem. Pre-deadline metadata hentes via
-- get_bid_metadata_for_tender() RPC i §10.

DROP POLICY IF EXISTS "bids_buyer_select_after_deadline" ON public.bids;
CREATE POLICY "bids_buyer_select_after_deadline"
  ON public.bids FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenders t
      WHERE t.id = bids.tender_id
        AND t.organisation_id IN (SELECT public.get_my_organisation_ids())
        AND t.submission_deadline < NOW()
    )
  );


-- ── §8. INSERT-policy for supplier ────────────────────────────────────────────
-- Suppliers kan oprette bids på sig selv (supplier_id = created_by = auth.uid())
-- på tenders der er åbne (status = 'published' eller 'open') og inden deadline.
-- Senere migration vil tillade at supplier_id peger på en organisation i stedet
-- for direkte på auth.users.

DROP POLICY IF EXISTS "bids_supplier_insert" ON public.bids;
CREATE POLICY "bids_supplier_insert"
  ON public.bids FOR INSERT TO authenticated
  -- tenders.status er en text-kolonne uden enum-constraint (teknisk gæld noteret
  -- i CLAUDE.md). Aktuelt brugte værdier: 'draft' og 'published'. INSERT kun
  -- tilladt på 'published' tenders.
  WITH CHECK (
    supplier_id = auth.uid()
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tenders t
      WHERE t.id = tender_id
        AND t.submission_deadline > NOW()
        AND t.status = 'published'
    )
  );


-- ── §9. UPDATE-policy for supplier ────────────────────────────────────────────
-- Suppliers kan opdatere egne bids før deadline.
-- INGEN UPDATE-policy for buyer — status-opdatering håndteres via
-- update_bid_status() RPC i §11. Det betyder buyer kan IKKE direkte opdatere
-- bids gennem normal UI table query.

DROP POLICY IF EXISTS "bids_supplier_update_before_deadline" ON public.bids;
CREATE POLICY "bids_supplier_update_before_deadline"
  ON public.bids FOR UPDATE TO authenticated
  USING (supplier_id = auth.uid())
  WITH CHECK (
    supplier_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tenders t
      WHERE t.id = tender_id
        AND t.submission_deadline > NOW()
    )
  );


-- ── §9b. DELETE-policy for supplier ──────────────────────────────────────────
-- Suppliers kan slette egne bids før deadline (trække tilbud tilbage).
-- Efter deadline er DELETE blokeret for alle authenticated brugere — bids
-- forbliver i historikken som dokumentation. Audit-trigger fyrer ved DELETE
-- og logger metadata til audit_logs.
--
-- INGEN DELETE-policy for buyer. Buyers kan aldrig slette bids — kun ændre
-- status via update_bid_status() RPC.

DROP POLICY IF EXISTS "bids_supplier_delete_before_deadline" ON public.bids;
CREATE POLICY "bids_supplier_delete_before_deadline"
  ON public.bids FOR DELETE TO authenticated
  USING (
    supplier_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tenders t
      WHERE t.id = bids.tender_id
        AND t.submission_deadline > NOW()
    )
  );


-- ── §10. RPC: pre-deadline metadata for buyer ─────────────────────────────────
-- Lader buyer se 'hvem har afgivet og hvornår' uafhængigt af tilbudsfrist.
-- Returnerer IKKE amount, currency, documents, espd_data — kun metadata.
-- Sikkerhedsdesign: SECURITY DEFINER + organisation-medlemskabstjek
-- forhindrer at funktionen lækker data til ikke-autoriserede brugere.
-- search_path = public, pg_temp blokerer search_path-injection.
-- STABLE markering tillader query-planner-memoization.

CREATE OR REPLACE FUNCTION public.get_bid_metadata_for_tender(p_tender_id UUID)
RETURNS TABLE(
  bid_id       UUID,
  supplier_id  UUID,
  submitted_at TIMESTAMPTZ,
  status       TEXT,
  created_at   TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    b.id,
    b.supplier_id,
    b.submitted_at,
    b.status::TEXT,
    b.created_at
  FROM public.bids b
  JOIN public.tenders t ON t.id = b.tender_id
  WHERE t.id = p_tender_id
    AND t.organisation_id IN (SELECT public.get_my_organisation_ids());
$$;


-- ── §11. RPC: buyer status-opdatering ─────────────────────────────────────────
-- Eneste vej for buyer til at ændre bid-status efter tilbudsfristen.
-- Validerer i rækkefølge: (1) bruger er admin/owner i tender's organisation,
-- (2) deadline er passeret, (3) ny status er en valid buyer-handling.
-- Whitelist af statusværdier: under_evaluation, accepted, rejected, winner,
-- not_awarded.
-- Suppliers kan ikke meningsfuldt kalde funktionen — get_my_admin_organisation_ids()
-- returnerer kun deres egne organisationer (ikke tender-ejerens).
-- RAISE EXCEPTION propagerer som RPC-fejl til klienten med korrekt SQLSTATE-kode.

CREATE OR REPLACE FUNCTION public.update_bid_status(
  p_bid_id    UUID,
  p_new_status TEXT
)
RETURNS public.bids
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tender  RECORD;
  v_updated public.bids;
BEGIN
  -- Hent tender-info via JOIN; afviser hvis bruger ikke er admin/owner i tender's org
  SELECT t.id, t.submission_deadline, t.organisation_id INTO v_tender
  FROM public.tenders t
  JOIN public.bids b ON b.tender_id = t.id
  WHERE b.id = p_bid_id
    AND t.organisation_id IN (SELECT public.get_my_admin_organisation_ids());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ikke autoriseret eller bid findes ikke'
      USING ERRCODE = '42501';
  END IF;

  -- Validér at deadline er passeret
  IF v_tender.submission_deadline > NOW() THEN
    RAISE EXCEPTION 'Status kan ikke opdateres før tilbudsfristens udløb'
      USING ERRCODE = '22023';
  END IF;

  -- Whitelist af tilladte buyer-statusværdier
  IF p_new_status NOT IN ('under_evaluation', 'accepted', 'rejected', 'winner', 'not_awarded') THEN
    RAISE EXCEPTION 'Ugyldig status for buyer-opdatering: %', p_new_status
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.bids
  SET    status     = p_new_status,
         updated_at = NOW()
  WHERE  id = p_bid_id
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;


-- ── §12. Audit-trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.audit_bid_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- VIGTIGT: Audit logger IKKE amount, currency, documents eller espd_data.
  -- Audit-loggen er en separat datakilde med egne RLS-policies — at logge
  -- fortrolige tilbudsdata her ville skabe en sekundær kanal der kunne
  -- omgå deadline-restriktionerne på selve bids-tabellen.
  -- Hvis fuld bid-historik bliver et reelt forretningskrav, oprettes en
  -- separat 'bids_audit_confidential'-tabel med stram service_role-only
  -- adgangsmodel i fremtidig migration.
  --
  -- actor_type-mønstret matcher 20260417120002 (organisations audit-triggers).

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    TG_OP,
    'bid',
    CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END,
    jsonb_build_object(
      'actor_type', CASE WHEN auth.uid() IS NULL THEN 'system' ELSE 'user' END,
      'data', CASE TG_OP
        WHEN 'INSERT' THEN jsonb_build_object(
          'tender_id',   NEW.tender_id,
          'supplier_id', NEW.supplier_id,
          'created_by',  NEW.created_by,
          'status',      NEW.status
        )
        WHEN 'UPDATE' THEN jsonb_build_object(
          'tender_id',   NEW.tender_id,
          'supplier_id', NEW.supplier_id,
          'old_status',  OLD.status,
          'new_status',  NEW.status
        )
        WHEN 'DELETE' THEN jsonb_build_object(
          'tender_id',   OLD.tender_id,
          'supplier_id', OLD.supplier_id,
          'status',      OLD.status
        )
      END
    )
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_bids ON public.bids;
CREATE TRIGGER audit_bids
  AFTER INSERT OR UPDATE OR DELETE ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_bid_change();


-- ── §13. Index på bids.created_by ─────────────────────────────────────────────
-- Index understøtter fremtidige queries der filtrerer bids på person snarere
-- end supplier-organisation. (Oprettet i §5 — dette er en guard mod gentagen
-- kørsel, men CREATE INDEX IF NOT EXISTS er i forvejen idempotent.)
