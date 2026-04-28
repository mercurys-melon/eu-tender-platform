-- ============================================================
-- Migration: organisations, organisation_types, organisation_members
--
-- Opretter grundstruktur for multi-tenant organisation-model jf. CLAUDE.md
-- (tabeloversigt: organisations, organisation_types, user_roles/RBAC).
--
-- Strategi D: additiv — ingen eksisterende tabeller ændres destruktivt.
--
-- tenders.organisation_id tilføjes som nullable UUID UDEN FK-constraint.
-- Eksisterende tenders bruger entity_id (VARCHAR) med heterogent indhold:
-- fritekst-organisationsnavne og auth.uid()-UUID'er (se probe-research
-- fra session 2026-04-27). FK-constraint tilføjes i separat migration
-- efter eksplicit datamigrering og validering.
--
-- Jf. CLAUDE.md: organisations, organisation_types, user_roles (RBAC
-- implementeret via organisation_members med role-enum).
-- ============================================================


-- ── 1. organisation_types (lookup-tabel med regulatorisk metadata) ────────────

CREATE TABLE IF NOT EXISTS public.organisation_types (
  code                 TEXT        PRIMARY KEY,
  name_da              TEXT        NOT NULL,
  name_en              TEXT        NOT NULL,
  description_da       TEXT,
  regulatory_reference TEXT,
  -- requires_cvr er forberedt til fremtidige organisation-typer der ikke har CVR.
  -- Pt. har alle tre seedede typer requires_cvr=true, og organisations.cvr er NOT NULL.
  -- Når en type med requires_cvr=false tilføjes, skal organisations.cvr gøres nullable
  -- og en CHECK-constraint tilføjes der validerer mod organisation_types.requires_cvr.
  -- Aktuel migration håndhæver IKKE denne logik.
  requires_cvr         BOOLEAN     NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── 2. Seed: lovpligtige organisationstyper ───────────────────────────────────
-- ON CONFLICT sikrer idempotens ved gentagen kørsel.

INSERT INTO public.organisation_types
  (code, name_da, name_en, description_da, regulatory_reference, requires_cvr)
VALUES
  (
    'housing_association',
    'Alment boligselskab',
    'Housing association',
    'Almene boligselskaber er omfattet af udbudspligten som offentligretlige organer '
    'og er underlagt særregler i almenboligloven samt Landsbyggefondens krav.',
    'Almenboligloven + udbudslovens §24, nr. 28',
    true
  ),
  (
    'municipality',
    'Kommune',
    'Municipality',
    'Kommuner er klassiske offentlige ordregivere omfattet af udbudslovens afsnit II '
    'og III for udbud over og under EU-tærskelværdierne.',
    'Udbudslovens afsnit II/III (LBK nr. 116 af 03/02/2025)',
    true
  ),
  (
    'public_body_other',
    'Andet offentligretligt organ',
    'Other public body',
    'Selvstændig juridisk person der opfylder almene behov af ikke-industriel eller '
    'kommerciel karakter, og som finansieres eller kontrolleres af det offentlige.',
    'Udbudslovens §24, nr. 28',
    true
  )
ON CONFLICT (code) DO NOTHING;


-- ── 3. organisations ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organisations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cvr           TEXT        NOT NULL UNIQUE CHECK (cvr ~ '^[0-9]{8}$'),
  name          TEXT        NOT NULL,
  type_code     TEXT        NOT NULL REFERENCES public.organisation_types(code),
  address_line1 TEXT,
  address_line2 TEXT,
  postal_code   TEXT,
  city          TEXT,
  country       TEXT        NOT NULL DEFAULT 'DK',
  contact_email TEXT,
  contact_phone TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID        REFERENCES auth.users(id)
);


-- ── 4. Indexes på organisations ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_organisations_cvr
  ON public.organisations(cvr);

CREATE INDEX IF NOT EXISTS idx_organisations_type_code
  ON public.organisations(type_code);

CREATE INDEX IF NOT EXISTS idx_organisations_is_active
  ON public.organisations(is_active);


-- ── 5. Enum: organisation_member_role ─────────────────────────────────────────
-- Guard mod duplicate ved gentagen kørsel (IF NOT EXISTS findes ikke for typer).

DO $$ BEGIN
  CREATE TYPE public.organisation_member_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── 6. organisation_members ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organisation_members (
  id              UUID                            PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID                            NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  profile_id      UUID                            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            public.organisation_member_role NOT NULL DEFAULT 'viewer',
  is_default      BOOLEAN                         NOT NULL DEFAULT false,
  invited_at      TIMESTAMPTZ                     NOT NULL DEFAULT NOW(),
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ                     NOT NULL DEFAULT NOW(),
  UNIQUE (organisation_id, profile_id)
);


-- ── 7. Indexes på organisation_members ───────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_org_members_profile_id
  ON public.organisation_members(profile_id);

CREATE INDEX IF NOT EXISTS idx_org_members_organisation_id
  ON public.organisation_members(organisation_id);


-- ── 8. Partial unique index: én default-organisation pr. bruger ───────────────
-- Håndhæver at is_default=true kun kan forekomme én gang pr. profile_id.
-- Gælder kun rækker hvor is_default=true — andre rækker er upåvirkede.

CREATE UNIQUE INDEX IF NOT EXISTS one_default_org_per_profile
  ON public.organisation_members(profile_id)
  WHERE is_default = true;


-- ── 9. tenders: tilføj organisation_id (nullable UUID, ingen FK endnu) ────────
-- BEVIDST UDEN FK-CONSTRAINT: eksisterende tenders har entity_id (VARCHAR) med
-- heterogent indhold — fritekst-organisationsnavne ("Testesen Kommune") og
-- auth.uid()-UUID'er blandet. Disse kan ikke automatisk mappes til organisations.id.
-- FK-constraint tilføjes i en fremtidig migration efter eksplicit datamigrering
-- og validering. Se note øverst i filen og probe-research 2026-04-27.

ALTER TABLE public.tenders
  ADD COLUMN IF NOT EXISTS organisation_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_tenders_organisation_id
  ON public.tenders(organisation_id);


-- ── 10. RLS-hjælpefunktioner ─────────────────────────────────────────────────
-- Formål: Undgår rekursion i self-refererende RLS-policies.
-- En policy på organisation_members der selv forespørger organisation_members
-- vil rekursivt udløse sin egen SELECT-policy i en uendelig løkke.
-- SECURITY DEFINER løser dette: funktionerne kører som funktionsejer (postgres)
-- og omgår RLS — de læser direkte fra tabellen for den aktuelle session-bruger.
--
-- Sikkerhedsovervejelse: SET search_path = public, pg_temp forhindrer
-- search_path-injection-angreb, hvor en ondsindet bruger lægger en funktion
-- i pg_temp der skygger for public-funktioner kaldt inde fra funktionen.
-- Ingen af funktionerne tager bruger-id som parameter — de læser udelukkende
-- auth.uid() fra sessionskonteksten for at undgå privilege escalation.

-- Alle organisations som den aktuelle bruger er medlem af (enhver rolle)
CREATE OR REPLACE FUNCTION public.get_my_organisation_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT organisation_id
  FROM public.organisation_members
  WHERE profile_id = auth.uid()
$$;

-- Organisations hvor den aktuelle bruger er owner eller admin
CREATE OR REPLACE FUNCTION public.get_my_admin_organisation_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT organisation_id
  FROM public.organisation_members
  WHERE profile_id = auth.uid()
    AND role IN ('owner', 'admin')
$$;

-- Organisations hvor den aktuelle bruger er owner
CREATE OR REPLACE FUNCTION public.get_my_owner_organisation_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT organisation_id
  FROM public.organisation_members
  WHERE profile_id = auth.uid()
    AND role = 'owner'
$$;


-- ── 11. RLS: organisation_types ──────────────────────────────────────────────
-- Alle authenticated brugere kan læse lookup-data.
-- INSERT/UPDATE/DELETE: ingen policy = implicit deny for non-service_role.

ALTER TABLE public.organisation_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_types_authenticated_read" ON public.organisation_types;
CREATE POLICY "org_types_authenticated_read"
  ON public.organisation_types
  FOR SELECT
  TO authenticated
  USING (true);


-- ── 12. RLS: organisations ────────────────────────────────────────────────────
-- RLS-policies bruger SET-returning SECURITY DEFINER-funktioner i IN-klausuler.
-- PostgreSQL's STABLE-markering på funktionerne aktiverer query-planner-memoization,
-- men ved meget store tabeller kan dette blive en performance-bottleneck. Observer
-- forespørgselsplaner i drift — optimering (fx materialized helper views eller
-- SECURITY INVOKER med direkte joins) udskydes til der er reelt målbar gevinst.

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orgs_member_select"        ON public.organisations;
DROP POLICY IF EXISTS "orgs_authenticated_insert" ON public.organisations;
DROP POLICY IF EXISTS "orgs_admin_update"         ON public.organisations;
DROP POLICY IF EXISTS "orgs_owner_delete"         ON public.organisations;

-- Medlemmer kan se organisationer de tilhører
CREATE POLICY "orgs_member_select"
  ON public.organisations
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_my_organisation_ids()));

-- Alle authenticated brugere kan oprette en organisation;
-- on_organisation_created-trigger indsætter automatisk owner-membership.
-- created_by = auth.uid() forhindrer at en bruger sætter en anden brugers UUID
-- som created_by og derved auto-tildeler sig selv owner-rolle for den anden bruger
-- via on_organisation_created-triggeren. service_role omgår RLS og er upåvirket.
CREATE POLICY "orgs_authenticated_insert"
  ON public.organisations
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Kun owners og admins kan redigere
CREATE POLICY "orgs_admin_update"
  ON public.organisations
  FOR UPDATE TO authenticated
  USING (id IN (SELECT public.get_my_admin_organisation_ids()));

-- Kun owners kan slette
CREATE POLICY "orgs_owner_delete"
  ON public.organisations
  FOR DELETE TO authenticated
  USING (id IN (SELECT public.get_my_owner_organisation_ids()));


-- ── 13. RLS: organisation_members ────────────────────────────────────────────
-- RLS-policies bruger SET-returning SECURITY DEFINER-funktioner i IN-klausuler.
-- PostgreSQL's STABLE-markering på funktionerne aktiverer query-planner-memoization,
-- men ved meget store tabeller kan dette blive en performance-bottleneck. Observer
-- forespørgselsplaner i drift — optimering (fx materialized helper views eller
-- SECURITY INVOKER med direkte joins) udskydes til der er reelt målbar gevinst.

ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_view_same_org"  ON public.organisation_members;
DROP POLICY IF EXISTS "admins_insert_members"  ON public.organisation_members;
DROP POLICY IF EXISTS "admins_update_members"  ON public.organisation_members;
DROP POLICY IF EXISTS "admins_delete_members"  ON public.organisation_members;

-- Brugere kan se alle medlemmer i organisationer de selv er med i
CREATE POLICY "members_view_same_org"
  ON public.organisation_members
  FOR SELECT TO authenticated
  USING (organisation_id IN (SELECT public.get_my_organisation_ids()));

-- Kun owners og admins kan tilføje nye medlemmer.
-- Undtagelse: on_organisation_created-trigger (SECURITY DEFINER) omgår RLS
-- ved oprettelse af første owner-membership.
CREATE POLICY "admins_insert_members"
  ON public.organisation_members
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id IN (SELECT public.get_my_admin_organisation_ids()));

-- Kun owners og admins kan ændre membership (fx rolle-skift).
-- Admins kan IKKE promovere til owner via denne policy — det kræver en dedikeret
-- SECURITY DEFINER-funktion (kommer i fremtidig migration) for at sikre korrekt
-- governance og forhindre unauthorized takeover af organisationen.
CREATE POLICY "admins_update_members"
  ON public.organisation_members
  FOR UPDATE TO authenticated
  USING (organisation_id IN (SELECT public.get_my_admin_organisation_ids()))
  WITH CHECK (
    organisation_id IN (SELECT public.get_my_admin_organisation_ids())
    AND role IN ('admin', 'editor', 'viewer')
  );

-- Owners og admins kan fjerne medlemmer; brugere kan altid forlade selv
CREATE POLICY "admins_delete_members"
  ON public.organisation_members
  FOR DELETE TO authenticated
  USING (
    organisation_id IN (SELECT public.get_my_admin_organisation_ids())
    OR profile_id = auth.uid()
  );


-- ── 14. Trigger: auto-opret owner-membership ved organisation-oprettelse ──────
-- Kører AFTER INSERT på organisations.
-- SECURITY DEFINER omgår RLS på organisation_members (ny org har ingen
-- members endnu, så admins_insert_members-policy ville ellers afvise).
-- Sætter is_default=true kun hvis brugeren ikke allerede har en default-org.
--
-- Rollback-garanti: funktionen indeholder INGEN EXCEPTION-blok der sluger fejl.
-- Hvis INSERT into organisation_members fejler (fx unik-constraint), propagerer
-- undtagelsen og ruller HELE organisations-INSERT tilbage. Det er ønsket adfærd.
--
-- created_by IS NULL: dette er en BEVIDST bypass til service_role-operationer
-- (fx import-scripts, seed-data) der indsætter organisations uden en aktiv
-- brugersession. Det er IKKE fejlhåndtering der gemmer en fejl.

CREATE OR REPLACE FUNCTION public.on_organisation_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_has_default BOOLEAN;
BEGIN
  -- Bevidst bypass: service_role-indsættelser sætter ikke created_by.
  -- Organisations oprettet uden created_by får ikke automatisk en owner.
  IF NEW.created_by IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.organisation_members
    WHERE profile_id = NEW.created_by
      AND is_default = true
  ) INTO v_has_default;

  -- Ingen EXCEPTION-håndtering her — fejl propagerer og ruller transaction tilbage.
  INSERT INTO public.organisation_members
    (organisation_id, profile_id, role, is_default, accepted_at)
  VALUES
    (NEW.id, NEW.created_by, 'owner', NOT v_has_default, NOW());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_organisation_created ON public.organisations;
CREATE TRIGGER trg_on_organisation_created
  AFTER INSERT ON public.organisations
  FOR EACH ROW
  EXECUTE FUNCTION public.on_organisation_created();


-- ── 15. Trigger: updated_at på organisations ──────────────────────────────────
-- Genbruger update_updated_at_column() fra initial schema (migrations_old/001).

DROP TRIGGER IF EXISTS update_organisations_updated_at ON public.organisations;
CREATE TRIGGER update_organisations_updated_at
  BEFORE UPDATE ON public.organisations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ── 16. Audit triggers ────────────────────────────────────────────────────────
-- audit_logs-skema: id, created_at, user_id, action, entity_type, entity_id,
-- metadata, ip_address — bekræftet via research 2026-04-27.
-- SECURITY DEFINER omgår RLS på audit_logs (INSERT-policy gælder service_role,
-- men SECURITY DEFINER kører som funktionsejer og har BYPASSRLS).
--
-- NULL auth.uid(): auth-konteksten er session-niveau, ikke funktions-niveau,
-- så auth.uid() returnerer den aktuelle brugers UUID også inden i SECURITY DEFINER.
-- Ved service_role-kald uden brugersession returnerer auth.uid() NULL —
-- dette indsættes som NULL i user_id-kolonnen, hvilket er korrekt (audit_logs
-- tillader NULL user_id via ON DELETE SET NULL-referencen til auth.users).
-- TODO (separat migration): tilføj 'actor_type' TEXT kolonne til audit_logs
-- med værdier 'user' (auth.uid() NOT NULL) og 'system' (auth.uid() IS NULL)
-- for at skelne bruger-handlinger fra systemhandlinger i audit-rapporter.
--
-- To distinkte audit-events ved organisations-oprettelse (B4):
-- Event 1: audit_organisations (entity_type='organisation') — selve org-rækken.
-- Event 2: audit_organisation_members (entity_type='organisation_member') —
--   owner-membership oprettet via on_organisation_created-trigger.
-- De to events er separate trigger-kald og producerer separate audit_logs-rækker.

CREATE OR REPLACE FUNCTION public.audit_organisation_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- actor_type i metadata er midlertidig løsning indtil audit_logs får dedikeret
  -- actor_type-kolonne (TODO i separat migration). Værdier: 'user' = auth.uid()
  -- NOT NULL, 'system' = auth.uid() IS NULL (service_role-operationer).
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    TG_OP,
    'organisation',
    CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END,
    jsonb_build_object(
      'actor_type', CASE WHEN auth.uid() IS NULL THEN 'system' ELSE 'user' END,
      'data', CASE TG_OP
        WHEN 'INSERT' THEN jsonb_build_object(
          'name',      NEW.name,
          'cvr',       NEW.cvr,
          'type_code', NEW.type_code
        )
        WHEN 'UPDATE' THEN jsonb_build_object(
          'old', jsonb_build_object('name', OLD.name, 'cvr', OLD.cvr, 'type_code', OLD.type_code, 'is_active', OLD.is_active),
          'new', jsonb_build_object('name', NEW.name, 'cvr', NEW.cvr, 'type_code', NEW.type_code, 'is_active', NEW.is_active)
        )
        WHEN 'DELETE' THEN jsonb_build_object(
          'name',      OLD.name,
          'cvr',       OLD.cvr,
          'type_code', OLD.type_code
        )
      END
    )
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_organisations ON public.organisations;
CREATE TRIGGER audit_organisations
  AFTER INSERT OR UPDATE OR DELETE ON public.organisations
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_organisation_change();


CREATE OR REPLACE FUNCTION public.audit_organisation_member_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- actor_type i metadata er midlertidig løsning indtil audit_logs får dedikeret
  -- actor_type-kolonne (TODO i separat migration). Værdier: 'user' = auth.uid()
  -- NOT NULL, 'system' = auth.uid() IS NULL (service_role-operationer).
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    TG_OP,
    'organisation_member',
    CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END,
    jsonb_build_object(
      'actor_type', CASE WHEN auth.uid() IS NULL THEN 'system' ELSE 'user' END,
      'data', CASE TG_OP
        WHEN 'INSERT' THEN jsonb_build_object(
          'organisation_id', NEW.organisation_id,
          'profile_id',      NEW.profile_id,
          'role',            NEW.role
        )
        WHEN 'UPDATE' THEN jsonb_build_object(
          'organisation_id', NEW.organisation_id,
          'profile_id',      NEW.profile_id,
          'old_role',        OLD.role,
          'new_role',        NEW.role
        )
        WHEN 'DELETE' THEN jsonb_build_object(
          'organisation_id', OLD.organisation_id,
          'profile_id',      OLD.profile_id,
          'role',            OLD.role
        )
      END
    )
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_organisation_members ON public.organisation_members;
CREATE TRIGGER audit_organisation_members
  AFTER INSERT OR UPDATE OR DELETE ON public.organisation_members
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_organisation_member_change();
