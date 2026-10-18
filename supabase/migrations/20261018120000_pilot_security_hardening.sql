-- ============================================================
-- Migration: pilot security hardening (2026-10-18)
--
-- Kør scripts/sql/diagnose-rls.sql FØR og EFTER. Køres i SQL Editor som én
-- transaktion. Idempotent: kan køres igen uden skade.
--
-- Lukker:
--   §1 Kladde-udbud læsbare for alle (inkl. anon) → kun offentlige statusser
--   §2 Direkte INSERT på tenders for enhver authenticated (omgår organisation_id)
--   §3 Forsegling kunne omgås: ejer kunne rykke submission_deadline tilbage
--      og dermed åbne bids-RLS ("bids_buyer_select_after_deadline") før tid
--   §4 tender_documents læsbare for alle (USING true) → offentlige kun når
--      udbuddet er publiceret og dokumentet er is_public
--   §5 tender_questions: spørgers identitet (contact_email/-name, asked_by) og
--      originaltekst kunne læses af alle via PostgREST → kolonne-låst
--   §6 tender_questions: enhver authenticated kunne INSERT'e med is_published=true
--   §7 audit_logs indeholdt tilbudspriser (bid.submitted) læsbare for ordregiver
--      før fristen → prisfelter fjernet fra eksisterende rækker
--   §8 Storage: alle buckets private; bid-documents oprettes
--   §9 Klient-skriveadgang fjernet (fundet i diagnose 18. okt.): ejer kunne via
--      PostgREST (a) indsætte dokument-rækker med vilkårlig storage_path, som
--      API'et derefter signerede/slettede med service-role, (b) sætte et udbud
--      til 'published' eller ændre organisation_id uden om API'et, (c) slette
--      offentliggjort materiale direkte i storage. Al skrivning sker nu via
--      API-routes (service-role) efter eksplicit autorisation.
--
-- Konsekvens for app-laget (allerede håndteret i samme kodeændring):
--   - Q&A-ejer-visning, moderation og spørgsmåls-INSERT bruger service-role
--     EFTER eksplicit autorisation i API-routes.
--   - Tilbudsfiler uploades med service-role til privat bucket.
--
-- Rollback: se nederst (kommenteret).
-- ============================================================

BEGIN;

-- ── §1. tenders: SELECT ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "read all tenders"                  ON public.tenders;
DROP POLICY IF EXISTS "Tenders are viewable by everyone"  ON public.tenders;
DROP POLICY IF EXISTS "tenders_public_select"             ON public.tenders;
DROP POLICY IF EXISTS "tenders_manager_select"            ON public.tenders;

-- Offentlige udbud (alt andet end kladde) kan ses af alle — udbudsmateriale
-- skal være frit tilgængeligt fra offentliggørelsen.
CREATE POLICY "tenders_public_select"
  ON public.tenders FOR SELECT TO anon, authenticated
  USING (status <> 'draft');

-- Ordregivers egne udbud, inkl. kladder.
CREATE POLICY "tenders_manager_select"
  ON public.tenders FOR SELECT TO authenticated
  USING (
    entity_id = auth.uid()::text
    OR organisation_id IN (SELECT public.get_my_organisation_ids())
  );

-- ── §2. tenders: INSERT kun via API (service-role) ──────────────────────────
-- API'et sætter organisation_id efter medlemskabstjek. Direkte INSERT fra
-- klienten ville give udbud uden organisation_id (og dermed brudt bids-RLS).
DROP POLICY IF EXISTS "Tenders are insertable by authenticated users" ON public.tenders;
-- Fundet i live-DB 18. okt. (diagnose-rapport): manuelt oprettet, samme hul.
DROP POLICY IF EXISTS "insert own tenders" ON public.tenders;

-- ── §3. tenders: forsegling — tilbudsfrist kan ikke fremrykkes efter publicering ─
CREATE OR REPLACE FUNCTION public.guard_tender_deadline_and_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Efter offentliggørelse må fristen kun forlænges, aldrig fremrykkes.
  -- Fremrykning ville åbne bids-RLS før tid og bryde forseglingen (BEK 1572).
  IF OLD.status <> 'draft'
     AND NEW.submission_deadline < OLD.submission_deadline THEN
    RAISE EXCEPTION 'Tilbudsfristen kan ikke fremrykkes efter offentliggørelse'
      USING ERRCODE = '22023';
  END IF;

  -- Et offentliggjort udbud kan ikke gøres til kladde igen (skjuler det for tilbudsgivere).
  IF OLD.status <> 'draft' AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'Et offentliggjort udbud kan ikke sættes tilbage til kladde'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenders_guard_deadline_and_status ON public.tenders;
CREATE TRIGGER trg_tenders_guard_deadline_and_status
  BEFORE UPDATE ON public.tenders
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_tender_deadline_and_status();

-- ── §4. tender_documents: SELECT ────────────────────────────────────────────
DROP POLICY IF EXISTS "read_docs_public_or_signed"     ON public.tender_documents;
DROP POLICY IF EXISTS "tender_documents_public_select" ON public.tender_documents;

CREATE POLICY "tender_documents_public_select"
  ON public.tender_documents FOR SELECT TO anon, authenticated
  USING (
    is_public = true
    AND EXISTS (
      SELECT 1 FROM public.tenders t
      WHERE t.id = tender_documents.tender_id AND t.status <> 'draft'
    )
  );
-- Ejer-adgang dækkes af eksisterende "owner_manage_docs" (FOR ALL, entity_id).

-- Fundet i live-DB 18. okt. (diagnose-rapport): manuelt oprettede policies på
-- rollen public. "insert_own" lod ENHVER bruger indsætte dokument-rækker på
-- ANDRES udbud (inkl. is_public=true og vilkårlig storage_path, som API'et så
-- ville signere). Upload sker kun via API (service-role) efter ejerskabstjek.
DROP POLICY IF EXISTS "tender_documents_insert_own" ON public.tender_documents;
DROP POLICY IF EXISTS "tender_documents_delete_own" ON public.tender_documents;
DROP POLICY IF EXISTS "tender_documents_select_own" ON public.tender_documents;

-- ── §5. tender_questions: kolonne-lås ───────────────────────────────────────
REVOKE SELECT ON public.tender_questions FROM anon, authenticated;
GRANT SELECT (id, tender_id, question_text_public, answer_text, is_published, created_at, updated_at)
  ON public.tender_questions TO anon, authenticated;

-- ── §6. tender_questions: INSERT kun via API ────────────────────────────────
-- API'et tvinger is_published=false og asked_by=auth-bruger.
DROP POLICY IF EXISTS "ask_question_any_authenticated" ON public.tender_questions;

-- ── §7. audit_logs: fjern tilbudspriser fra eksisterende rækker ─────────────
UPDATE public.audit_logs
SET metadata = metadata - 'amount' - 'currency'
WHERE metadata ? 'amount' OR metadata ? 'currency';

-- ── §8. Storage: private buckets ────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('bid-documents', 'bid-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

UPDATE storage.buckets SET public = false
WHERE id IN ('tender-docs', 'tender-documents', 'bid-documents', 'evaluation-documents', 'supplier-documents');

-- Legacy-policy fra migrations_old/001 (forkert sti-antagelse; adgang sker server-side)
DROP POLICY IF EXISTS "Bid documents are accessible by bid owner" ON storage.objects;

-- ── §9. Ingen direkte klient-skrivning på udbud, dokumenter, Q&A og storage ─
-- tenders: UPDATE kun via API (service-role). Triggeren i §3 gælder stadig.
DROP POLICY IF EXISTS "update own tenders"              ON public.tenders;
DROP POLICY IF EXISTS "Tenders are updatable by owner"  ON public.tenders;

-- tender_documents: FOR ALL erstattes af ren læseadgang for ordregiver.
DROP POLICY IF EXISTS "owner_manage_docs"               ON public.tender_documents;
DROP POLICY IF EXISTS "tender_documents_manager_select" ON public.tender_documents;
CREATE POLICY "tender_documents_manager_select"
  ON public.tender_documents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenders t
      WHERE t.id = tender_documents.tender_id
        AND (t.entity_id = auth.uid()::text
             OR t.organisation_id IN (SELECT public.get_my_organisation_ids()))
    )
  );

-- tender_questions: ejer-visning og moderation sker via API (service-role).
DROP POLICY IF EXISTS "owner_manage_qna"                ON public.tender_questions;

-- storage: ingen klient-adgang til tender-docs; signerede URL'er udstedes af API'et.
DROP POLICY IF EXISTS "tender_docs_owner_access"        ON storage.objects;

COMMIT;

-- ============================================================
-- ROLLBACK (kun ved akut behov — genåbner hullerne):
-- BEGIN;
-- DROP POLICY IF EXISTS "tenders_public_select" ON public.tenders;
-- DROP POLICY IF EXISTS "tenders_manager_select" ON public.tenders;
-- CREATE POLICY "read all tenders" ON public.tenders FOR SELECT TO anon, authenticated USING (true);
-- DROP TRIGGER IF EXISTS trg_tenders_guard_deadline_and_status ON public.tenders;
-- DROP POLICY IF EXISTS "tender_documents_public_select" ON public.tender_documents;
-- CREATE POLICY "read_docs_public_or_signed" ON public.tender_documents FOR SELECT USING (true);
-- GRANT SELECT ON public.tender_questions TO anon, authenticated;
-- COMMIT;
-- ============================================================
