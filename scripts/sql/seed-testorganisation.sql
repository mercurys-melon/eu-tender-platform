-- ============================================================
-- seed-testorganisation.sql — KUN TESTDATA. Kør EFTER migration 20261018120000.
--
-- Baseret på diagnose-rapport 18. okt. 2026:
--   ab969e5e-… = ordregiver-testbruger (ejer kladden "20260327 test 1")
--   c8dd847b-… = "Test Testesen" → bruges som tilbudsgiver-testbruger
-- Idempotent: kan køres flere gange.
-- ============================================================
BEGIN;

-- 1. Test-ordregiver. Triggeren on_organisation_created opretter automatisk
--    owner-medlemskab (accepted_at = NOW()) for created_by.
INSERT INTO public.organisations (name, cvr, type_code, created_by, contact_email)
SELECT 'Test Boligselskab (TESTDATA)', '99999999', 'housing_association',
       'ab969e5e-29de-494a-89f5-d7b193057f4b', 'test@mercurrytender.dk'
WHERE NOT EXISTS (SELECT 1 FROM public.organisations WHERE cvr = '99999999');

-- 2. Knyt de tre eksisterende testudbud til organisationen
--    (to af dem har legacy fritekst i entity_id: "Testesen Kommune"/"Teste Kommune").
UPDATE public.tenders
SET organisation_id = (SELECT id FROM public.organisations WHERE cvr = '99999999')
WHERE id IN (
  '93c67fca-daaf-46f5-8845-78dc9c27364f',
  'e1d4c5fd-9621-4bd9-aca7-8aa3ccd5e8e2',
  '2ae38b7b-4aae-415e-a07c-5e249116ebdd'
)
AND organisation_id IS NULL;

-- 3. "Test Testesen" som tilbudsgiver, så du kan teste begge sider
UPDATE public.profiles
SET active_role = 'supplier'
WHERE id = 'c8dd847b-ac77-4652-ab74-6f0b025d67e1';

-- Kontrol (vises som resultat)
SELECT o.name, m.profile_id, m.role, m.accepted_at IS NOT NULL AS accepteret,
       (SELECT count(*) FROM public.tenders t WHERE t.organisation_id = o.id) AS udbud
FROM public.organisations o
JOIN public.organisation_members m ON m.organisation_id = o.id
WHERE o.cvr = '99999999';

COMMIT;
