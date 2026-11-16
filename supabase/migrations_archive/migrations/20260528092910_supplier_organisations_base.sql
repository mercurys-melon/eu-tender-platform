-- ─────────────────────────────────────────────────────────────────────────
-- Migration: supplier_organisations_base
-- Reference: SCHEMA-DESIGN.md #5 (fundament for tilbudsgiver-virksomheds-model)
--
-- Baggrund:
--   Den eksisterende model knytter bids direkte til auth.users(id) via
--   bids.supplier_id. Det mangler et virksomheds-niveau: en tilbudsgiver er
--   en juridisk person (CVR), ikke et individ, og kan have flere medarbejdere.
--
--   Denne migration etablerer fundamentet:
--     - supplier_organisations: tilbudsgiver-virksomheder
--     - supplier_organisation_users: M:N user <-> virksomhed med rolle
--
--   Selve bids-refaktoreringen (supplier_id -> supplier_organisation_id) og
--   tender_participants sker i SENERE migrations (#5 participants, #5 bids-refactor).
--   Denne migration roerer IKKE bids.
--
-- Moenster:
--   Spejler 20260417120002_organisations_and_membership.sql (organisations +
--   organisation_members) for konsistens: SECURITY DEFINER RLS-helpers,
--   TO authenticated policies, AFTER INSERT-trigger til auto-owner-membership,
--   update_updated_at_column() genbrugt, audit-triggers i actor_type-moenster.
--
-- Bootstrap:
--   Ved oprettelse af en supplier_organisation indsaetter en AFTER INSERT-trigger
--   automatisk kalderen (created_by) som 'owner' i supplier_organisation_users.
--   Dette spejler trg_on_organisation_created paa organisations.
-- ─────────────────────────────────────────────────────────────────────────


-- ── §1. ENUM: supplier_member_role ─────────────────────────────────────────
-- Guard mod duplicate (samme moenster som organisation_member_role i 20260417120002)
DO $$ BEGIN
  CREATE TYPE public.supplier_member_role AS ENUM ('owner', 'member');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- ── §2. TABEL: supplier_organisations ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.supplier_organisations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identitet. CVR for danske; foreign_id (fx VAT) for udenlandske.
  cvr_number         VARCHAR(8),                       -- 8 cifre; NULL for udenlandske + legacy
  country_code       CHAR(2) NOT NULL DEFAULT 'DK',
  foreign_id         TEXT,                             -- VAT-nr e.l. for udenlandske
  legal_name         TEXT NOT NULL,

  -- Kontakt og adresse
  address            JSONB,                            -- struktureret adresse (valideres app-side via zod)
  contact_email      TEXT,
  contact_phone      TEXT,
  website            TEXT,

  -- Markerer auto-oprettede orgs ved fremtidig bids-backfill (#5 bids-refactor).
  -- Saettes default false; backfill-migrationen saetter true paa dem den opretter.
  is_legacy_personal BOOLEAN NOT NULL DEFAULT false,

  -- Audit (standard-moenster)
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- CVR maa kun bruge gyldige 8-cifrede vaerdier naar den er sat
  CONSTRAINT supplier_organisations_cvr_format
    CHECK (cvr_number IS NULL OR cvr_number ~ '^[0-9]{8}$')
);

-- Partial unique: CVR unik naar sat (tillader mange NULL for udenlandske/legacy)
CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_organisations_cvr
  ON public.supplier_organisations (cvr_number)
  WHERE cvr_number IS NOT NULL;

-- Partial unique: (country_code, foreign_id) unik naar foreign_id sat
CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_organisations_foreign
  ON public.supplier_organisations (country_code, foreign_id)
  WHERE foreign_id IS NOT NULL;


-- ── §3. TABEL: supplier_organisation_users ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.supplier_organisation_users (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_organisation_id  UUID NOT NULL
                              REFERENCES public.supplier_organisations(id) ON DELETE CASCADE,
  user_id                   UUID NOT NULL
                              REFERENCES auth.users(id) ON DELETE CASCADE,
  role                      public.supplier_member_role NOT NULL DEFAULT 'member',
  invited_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Audit
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_supplier_org_users UNIQUE (supplier_organisation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_org_users_user_id
  ON public.supplier_organisation_users (user_id);

CREATE INDEX IF NOT EXISTS idx_supplier_org_users_org_id
  ON public.supplier_organisation_users (supplier_organisation_id);


-- ── §4. RLS-HJAELPEFUNKTIONER ──────────────────────────────────────────────
-- Spejler get_my_organisation_ids() / get_my_owner_organisation_ids().
-- SECURITY DEFINER for at undgaa RLS-rekursion: funktionen laeser
-- supplier_organisation_users uden at trigge dens egne policies.

CREATE OR REPLACE FUNCTION public.get_my_supplier_organisation_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT supplier_organisation_id
  FROM public.supplier_organisation_users
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_owner_supplier_organisation_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT supplier_organisation_id
  FROM public.supplier_organisation_users
  WHERE user_id = auth.uid()
    AND role = 'owner';
$$;


-- ── §5. BOOTSTRAP-TRIGGER: auto-owner ved org-oprettelse ───────────────────
-- Spejler trg_on_organisation_created. Naar en supplier_organisation oprettes,
-- indsaettes created_by automatisk som 'owner' i supplier_organisation_users.
-- SECURITY DEFINER saa insert sker uafhaengigt af users-tabellens egne policies.

CREATE OR REPLACE FUNCTION public.handle_new_supplier_organisation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Kun hvis created_by er sat (dvs. oprettet af en autentificeret bruger,
  -- ikke et system/service-kald uden auth-kontekst).
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.supplier_organisation_users
      (supplier_organisation_id, user_id, role, joined_at)
    VALUES
      (NEW.id, NEW.created_by, 'owner', now())
    ON CONFLICT (supplier_organisation_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_supplier_organisation_created
  ON public.supplier_organisations;
CREATE TRIGGER trg_on_supplier_organisation_created
  AFTER INSERT ON public.supplier_organisations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_supplier_organisation();


-- ── §6. UPDATED_AT-TRIGGERS (genbruger eksisterende update_updated_at_column) ─
DROP TRIGGER IF EXISTS update_supplier_organisations_updated_at
  ON public.supplier_organisations;
CREATE TRIGGER update_supplier_organisations_updated_at
  BEFORE UPDATE ON public.supplier_organisations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_supplier_organisation_users_updated_at
  ON public.supplier_organisation_users;
CREATE TRIGGER update_supplier_organisation_users_updated_at
  BEFORE UPDATE ON public.supplier_organisation_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ── §7. RLS: supplier_organisations ────────────────────────────────────────
ALTER TABLE public.supplier_organisations ENABLE ROW LEVEL SECURITY;

-- SELECT: medlemmer kan se egne virksomheder.
-- (Ordregiver-synlighed paa tvaers af tender haandteres senere via
--  tender_participants i #5 participants — IKKE her.)
DROP POLICY IF EXISTS supplier_organisations_select_member
  ON public.supplier_organisations;
CREATE POLICY supplier_organisations_select_member
  ON public.supplier_organisations
  FOR SELECT
  TO authenticated
  USING (id IN (SELECT public.get_my_supplier_organisation_ids()));

-- INSERT: enhver autentificeret bruger kan oprette en virksomhed,
-- men kun med sig selv som created_by. Owner-relationen skabes af triggeren (§5).
DROP POLICY IF EXISTS supplier_organisations_insert_self
  ON public.supplier_organisations;
CREATE POLICY supplier_organisations_insert_self
  ON public.supplier_organisations
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- UPDATE: kun owners.
DROP POLICY IF EXISTS supplier_organisations_update_owner
  ON public.supplier_organisations;
CREATE POLICY supplier_organisations_update_owner
  ON public.supplier_organisations
  FOR UPDATE
  TO authenticated
  USING (id IN (SELECT public.get_my_owner_supplier_organisation_ids()))
  WITH CHECK (id IN (SELECT public.get_my_owner_supplier_organisation_ids()));

-- DELETE: bevidst INGEN policy. Virksomheder slettes ikke via klient i v1.
-- (Hvis en owner skal kunne slette, tilfoejes en eksplicit policy senere.)


-- ── §8. RLS: supplier_organisation_users ───────────────────────────────────
ALTER TABLE public.supplier_organisation_users ENABLE ROW LEVEL SECURITY;

-- SELECT: medlemmer kan se medlemslisten for egne virksomheder.
DROP POLICY IF EXISTS supplier_org_users_select_member
  ON public.supplier_organisation_users;
CREATE POLICY supplier_org_users_select_member
  ON public.supplier_organisation_users
  FOR SELECT
  TO authenticated
  USING (supplier_organisation_id IN (SELECT public.get_my_supplier_organisation_ids()));

-- INSERT: kun owners kan tilfoeje medlemmer (invitation-flow).
-- Bootstrap-owner indsaettes af triggeren (§5, SECURITY DEFINER, omgaar denne policy).
DROP POLICY IF EXISTS supplier_org_users_insert_owner
  ON public.supplier_organisation_users;
CREATE POLICY supplier_org_users_insert_owner
  ON public.supplier_organisation_users
  FOR INSERT
  TO authenticated
  WITH CHECK (supplier_organisation_id IN (SELECT public.get_my_owner_supplier_organisation_ids()));

-- UPDATE: kun owners (fx aendre en andens rolle).
DROP POLICY IF EXISTS supplier_org_users_update_owner
  ON public.supplier_organisation_users;
CREATE POLICY supplier_org_users_update_owner
  ON public.supplier_organisation_users
  FOR UPDATE
  TO authenticated
  USING (supplier_organisation_id IN (SELECT public.get_my_owner_supplier_organisation_ids()))
  WITH CHECK (supplier_organisation_id IN (SELECT public.get_my_owner_supplier_organisation_ids()));

-- DELETE: kun owners (fjern medlem).
DROP POLICY IF EXISTS supplier_org_users_delete_owner
  ON public.supplier_organisation_users;
CREATE POLICY supplier_org_users_delete_owner
  ON public.supplier_organisation_users
  FOR DELETE
  TO authenticated
  USING (supplier_organisation_id IN (SELECT public.get_my_owner_supplier_organisation_ids()));


-- ── §9. AUDIT-TRIGGERS ─────────────────────────────────────────────────────
-- Hardkodet pr. tabel (entity_type som streng-literal), spejler
-- audit_bid_change() fra 20260428143000. SECURITY DEFINER omgaar RLS, saa
-- INSERT til audit_logs lykkes uden service_role. AFTER-trigger returnerer NULL.
--
-- Designvalg: data-payload holdes minimal. Vi logger at handlingen skete + id,
-- ikke fuld raekke-dump eller felt-for-felt-diff. Supplier-org-data kraever ikke
-- samme detaljegrad som bids. Kan udvides senere hvis compliance-behov opstaar.

CREATE OR REPLACE FUNCTION public.audit_supplier_organisation_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    TG_OP,
    'supplier_organisation',
    CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END,
    jsonb_build_object(
      'actor_type', CASE WHEN auth.uid() IS NULL THEN 'system' ELSE 'user' END,
      'legal_name', CASE TG_OP WHEN 'DELETE' THEN OLD.legal_name ELSE NEW.legal_name END,
      'cvr_number', CASE TG_OP WHEN 'DELETE' THEN OLD.cvr_number ELSE NEW.cvr_number END
    )
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_supplier_organisations
  ON public.supplier_organisations;
CREATE TRIGGER audit_supplier_organisations
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_organisations
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_supplier_organisation_change();


CREATE OR REPLACE FUNCTION public.audit_supplier_organisation_member_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    TG_OP,
    'supplier_organisation_member',
    CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END,
    jsonb_build_object(
      'actor_type', CASE WHEN auth.uid() IS NULL THEN 'system' ELSE 'user' END,
      'supplier_organisation_id', CASE TG_OP WHEN 'DELETE' THEN OLD.supplier_organisation_id ELSE NEW.supplier_organisation_id END,
      'member_user_id', CASE TG_OP WHEN 'DELETE' THEN OLD.user_id ELSE NEW.user_id END,
      'role', CASE TG_OP WHEN 'DELETE' THEN OLD.role ELSE NEW.role END
    )
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_supplier_organisation_users
  ON public.supplier_organisation_users;
CREATE TRIGGER audit_supplier_organisation_users
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_organisation_users
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_supplier_organisation_member_change();
  

-- ── §10. SLUT ──────────────────────────────────────────────────────────────
-- Naeste migrations i #5-kaeden: tender_participants, derefter bids-refactor.