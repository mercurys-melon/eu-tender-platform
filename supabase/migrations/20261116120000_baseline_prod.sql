-- ============================================================================
-- 20261116120000_baseline_prod.sql — BASELINE af produktionsskemaet
--
-- GENERERET af scripts/build-baseline.mjs. Redigér ikke i hånden — ret scriptet
-- og kør det igen. Kilde: pg_dump 18.7 af produktion (Postgres 17.4) taget
-- 16. november 2026, filerne i scripts/sql/output/baseline/.
--
-- MÅ ALDRIG EKSEKVERES I PRODUKTION. Produktion har allerede dette skema;
-- dér markeres filen kun som kørt:
--     supabase migration repair --status applied 20261116120000
-- Filen køres kun mod tomme databaser (lokal, preview, ny instans).
-- Vagten nedenfor afbryder, hvis public.tenders allerede findes.
--
-- ÉN TRANSAKTION (BEGIN … COMMIT): filen starter med at fjerne postgres'
-- default privileges i public og genopretter dem først til sidst. Fejler
-- kørslen undervejs, må den tilstand ikke blive stående. Det er ikke
-- dokumenteret, at "supabase db push" selv kører en migrationsfil atomisk,
-- så transaktionen er eksplicit. Intet i dumpet er uforeneligt med en
-- transaktion (ingen CREATE INDEX CONCURRENTLY, ALTER TYPE … ADD VALUE,
-- VACUUM eller lignende — build-scriptet kontrollerer det). Vagten ligger
-- inde i transaktionen, så en klient, der fortsætter efter fejl, ikke kan
-- udføre resten.
--
-- HVORFOR DEFAULT PRIVILEGES FJERNES FØRST: pg_dump udskriver kun de GRANTs,
-- der findes, og antager at nye objekter starter uden rettigheder. På Supabase
-- giver default privileges ALL til anon/authenticated/service_role på alt nyt
-- i public. Uden REVOKE ville skrivelåsen på bids, kolonnelåsen på
-- tender_questions og EXECUTE-låsene på get_bid_count_for_tender() og
-- get_bid_metadata_for_tender() ikke blive genskabt. Forudsætter kørsel som
-- rollen postgres.
--
-- FJERNET fra dumpet (platformen ejer dem): \restrict/\unrestrict, extensions,
-- publikationen supabase_realtime, event triggers, ACL i extensions og vault,
-- default privileges for supabase_admin. Alt andet er kopieret byte for byte,
-- inkl. blandede linjeskift (CRLF/LF) i funktionskroppe.
-- TILFØJET efter public-delen: trigger on_auth_user_created på auth.users,
-- buckets tender-docs og bid-documents, de tre rækker i organisation_types.
--
-- Kræver Postgres 17 (transaction_timeout, MAINTAIN-privilegiet).
-- Skemaet gengives som det ER, også kendte fejl (se SESSION_NOTES.md 16. nov.).
-- ============================================================================

BEGIN;

-- Vagt mod fejlkørsel: må kun køres mod en database uden public.tenders.
DO $baseline_vagt$
BEGIN
  IF to_regclass('public.tenders') IS NOT NULL THEN
    RAISE EXCEPTION
      'AFBRUDT: public.tenders findes allerede. Baseline må ikke køres mod en eksisterende database (heller ikke produktion) - markér den som kørt med: supabase migration repair --status applied 20261116120000'
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
END
$baseline_vagt$;

-- Midlertidigt: nye objekter i public får ingen klient-rettigheder automatisk.
-- Genoprettes af dumpets egne ALTER DEFAULT PRIVILEGES … GRANT sidst i public-delen.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;

-- ===== START: prod-public.sql (filtreret, ellers uændret) =====
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.4
-- Dumped by pg_dump version 18.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: organisation_member_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."organisation_member_role" AS ENUM (
    'owner',
    'admin',
    'editor',
    'viewer'
);


ALTER TYPE "public"."organisation_member_role" OWNER TO "postgres";

--
-- Name: supplier_member_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."supplier_member_role" AS ENUM (
    'owner',
    'member'
);


ALTER TYPE "public"."supplier_member_role" OWNER TO "postgres";

--
-- Name: audit_bid_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."audit_bid_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."audit_bid_change"() OWNER TO "postgres";

--
-- Name: audit_organisation_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."audit_organisation_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."audit_organisation_change"() OWNER TO "postgres";

--
-- Name: audit_organisation_member_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."audit_organisation_member_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."audit_organisation_member_change"() OWNER TO "postgres";

--
-- Name: audit_supplier_organisation_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."audit_supplier_organisation_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."audit_supplier_organisation_change"() OWNER TO "postgres";

--
-- Name: audit_supplier_organisation_member_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."audit_supplier_organisation_member_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."audit_supplier_organisation_member_change"() OWNER TO "postgres";

--
-- Name: bids_set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."bids_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."bids_set_updated_at"() OWNER TO "postgres";

--
-- Name: get_bid_count_for_tender("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_bid_count_for_tender"("p_tender_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT count(*)::INTEGER
  FROM public.bids b
  JOIN public.tenders t ON t.id = b.tender_id
  WHERE t.id = p_tender_id
    AND t.organisation_id IN (SELECT public.get_my_organisation_ids());
$$;


ALTER FUNCTION "public"."get_bid_count_for_tender"("p_tender_id" "uuid") OWNER TO "postgres";

--
-- Name: get_bid_metadata_for_tender("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_bid_metadata_for_tender"("p_tender_id" "uuid") RETURNS TABLE("bid_id" "uuid", "supplier_id" "uuid", "submitted_at" timestamp with time zone, "status" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_bid_metadata_for_tender"("p_tender_id" "uuid") OWNER TO "postgres";

--
-- Name: get_my_admin_organisation_ids(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_my_admin_organisation_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT organisation_id
  FROM public.organisation_members
  WHERE profile_id = auth.uid()
    AND role IN ('owner', 'admin')
$$;


ALTER FUNCTION "public"."get_my_admin_organisation_ids"() OWNER TO "postgres";

--
-- Name: get_my_organisation_ids(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_my_organisation_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT organisation_id
  FROM public.organisation_members
  WHERE profile_id = auth.uid()
$$;


ALTER FUNCTION "public"."get_my_organisation_ids"() OWNER TO "postgres";

--
-- Name: get_my_owner_organisation_ids(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_my_owner_organisation_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT organisation_id
  FROM public.organisation_members
  WHERE profile_id = auth.uid()
    AND role = 'owner'
$$;


ALTER FUNCTION "public"."get_my_owner_organisation_ids"() OWNER TO "postgres";

--
-- Name: get_my_owner_supplier_organisation_ids(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_my_owner_supplier_organisation_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT supplier_organisation_id
  FROM public.supplier_organisation_users
  WHERE user_id = auth.uid()
    AND role = 'owner';
$$;


ALTER FUNCTION "public"."get_my_owner_supplier_organisation_ids"() OWNER TO "postgres";

--
-- Name: get_my_supplier_organisation_ids(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_my_supplier_organisation_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT supplier_organisation_id
  FROM public.supplier_organisation_users
  WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_supplier_organisation_ids"() OWNER TO "postgres";

--
-- Name: guard_bid_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."guard_bid_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."guard_bid_insert"() OWNER TO "postgres";

--
-- Name: guard_tender_deadline_and_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."guard_tender_deadline_and_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."guard_tender_deadline_and_status"() OWNER TO "postgres";

--
-- Name: handle_new_supplier_organisation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."handle_new_supplier_organisation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."handle_new_supplier_organisation"() OWNER TO "postgres";

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, role, active_role, full_name)
  VALUES (
    NEW.id,
    'buyer',
    'buyer',
    NEW.raw_user_meta_data ->> 'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

--
-- Name: on_organisation_created(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."on_organisation_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."on_organisation_created"() OWNER TO "postgres";

--
-- Name: set_bids_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."set_bids_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end $$;


ALTER FUNCTION "public"."set_bids_updated_at"() OWNER TO "postgres";

--
-- Name: set_created_by(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."set_created_by"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."set_created_by"() OWNER TO "postgres";

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: bids; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."bids" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tender_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "currency" "text" DEFAULT 'DKK'::"text" NOT NULL,
    "documents" "text"[] DEFAULT '{}'::"text"[],
    "espd_data" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "bids_status_check" CHECK (("status" = ANY (ARRAY['submitted'::"text", 'under_review'::"text", 'accepted'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."bids" OWNER TO "postgres";

--
-- Name: update_bid_status("uuid", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."update_bid_status"("p_bid_id" "uuid", "p_new_status" "text") RETURNS "public"."bids"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."update_bid_status"("p_bid_id" "uuid", "p_new_status" "text") OWNER TO "postgres";

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "metadata" "jsonb",
    "ip_address" "text"
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";

--
-- Name: organisation_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."organisation_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "role" "public"."organisation_member_role" DEFAULT 'viewer'::"public"."organisation_member_role" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "invited_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organisation_members" OWNER TO "postgres";

--
-- Name: organisation_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."organisation_types" (
    "code" "text" NOT NULL,
    "name_da" "text" NOT NULL,
    "name_en" "text" NOT NULL,
    "description_da" "text",
    "regulatory_reference" "text",
    "requires_cvr" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organisation_types" OWNER TO "postgres";

--
-- Name: organisations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."organisations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cvr" "text" NOT NULL,
    "name" "text" NOT NULL,
    "type_code" "text" NOT NULL,
    "address_line1" "text",
    "address_line2" "text",
    "postal_code" "text",
    "city" "text",
    "country" "text" DEFAULT 'DK'::"text" NOT NULL,
    "contact_email" "text",
    "contact_phone" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "organisations_cvr_check" CHECK (("cvr" ~ '^[0-9]{8}$'::"text"))
);


ALTER TABLE "public"."organisations" OWNER TO "postgres";

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "full_name" "text",
    "active_role" "text" DEFAULT 'buyer'::"text" NOT NULL,
    CONSTRAINT "profiles_active_role_check" CHECK (("active_role" = ANY (ARRAY['buyer'::"text", 'supplier'::"text"]))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['buyer'::"text", 'supplier'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";

--
-- Name: supplier_organisation_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."supplier_organisation_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_organisation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."supplier_member_role" DEFAULT 'member'::"public"."supplier_member_role" NOT NULL,
    "invited_by" "uuid",
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."supplier_organisation_users" OWNER TO "postgres";

--
-- Name: supplier_organisations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."supplier_organisations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cvr_number" character varying(8),
    "country_code" character(2) DEFAULT 'DK'::"bpchar" NOT NULL,
    "foreign_id" "text",
    "legal_name" "text" NOT NULL,
    "address" "jsonb",
    "contact_email" "text",
    "contact_phone" "text",
    "website" "text",
    "is_legacy_personal" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "supplier_organisations_cvr_format" CHECK ((("cvr_number" IS NULL) OR (("cvr_number")::"text" ~ '^[0-9]{8}$'::"text")))
);


ALTER TABLE "public"."supplier_organisations" OWNER TO "postgres";

--
-- Name: tender_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."tender_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tender_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "size_bytes" bigint NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tender_documents" OWNER TO "postgres";

--
-- Name: tender_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."tender_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tender_id" "uuid" NOT NULL,
    "asked_by" "uuid",
    "question_text" "text" NOT NULL,
    "question_text_public" "text" DEFAULT ''::"text" NOT NULL,
    "answer_text" "text",
    "is_published" boolean DEFAULT false NOT NULL,
    "is_anonymized" boolean DEFAULT true NOT NULL,
    "contact_email" "text",
    "contact_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tender_questions" OWNER TO "postgres";

--
-- Name: tenders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."tenders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "entity_id" "text" NOT NULL,
    "category" "text" NOT NULL,
    "estimated_value" numeric NOT NULL,
    "currency" "text" DEFAULT 'DKK'::"text" NOT NULL,
    "submission_deadline" timestamp with time zone NOT NULL,
    "publication_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'published'::"text" NOT NULL,
    "espd_required" boolean DEFAULT false NOT NULL,
    "ted_published" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "organisation_id" "uuid",
    CONSTRAINT "tenders_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'closed'::"text", 'awarded'::"text"])))
);


ALTER TABLE "public"."tenders" OWNER TO "postgres";

--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");


--
-- Name: bids bids_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_pkey" PRIMARY KEY ("id");


--
-- Name: organisation_members organisation_members_organisation_id_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."organisation_members"
    ADD CONSTRAINT "organisation_members_organisation_id_profile_id_key" UNIQUE ("organisation_id", "profile_id");


--
-- Name: organisation_members organisation_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."organisation_members"
    ADD CONSTRAINT "organisation_members_pkey" PRIMARY KEY ("id");


--
-- Name: organisation_types organisation_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."organisation_types"
    ADD CONSTRAINT "organisation_types_pkey" PRIMARY KEY ("code");


--
-- Name: organisations organisations_cvr_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."organisations"
    ADD CONSTRAINT "organisations_cvr_key" UNIQUE ("cvr");


--
-- Name: organisations organisations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."organisations"
    ADD CONSTRAINT "organisations_pkey" PRIMARY KEY ("id");


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");


--
-- Name: supplier_organisation_users supplier_organisation_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."supplier_organisation_users"
    ADD CONSTRAINT "supplier_organisation_users_pkey" PRIMARY KEY ("id");


--
-- Name: supplier_organisations supplier_organisations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."supplier_organisations"
    ADD CONSTRAINT "supplier_organisations_pkey" PRIMARY KEY ("id");


--
-- Name: tender_documents tender_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."tender_documents"
    ADD CONSTRAINT "tender_documents_pkey" PRIMARY KEY ("id");


--
-- Name: tender_questions tender_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."tender_questions"
    ADD CONSTRAINT "tender_questions_pkey" PRIMARY KEY ("id");


--
-- Name: tenders tenders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."tenders"
    ADD CONSTRAINT "tenders_pkey" PRIMARY KEY ("id");


--
-- Name: supplier_organisation_users uq_supplier_org_users; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."supplier_organisation_users"
    ADD CONSTRAINT "uq_supplier_org_users" UNIQUE ("supplier_organisation_id", "user_id");


--
-- Name: bids_tender_supplier_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "bids_tender_supplier_unique" ON "public"."bids" USING "btree" ("tender_id", "supplier_id");


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_audit_logs_entity" ON "public"."audit_logs" USING "btree" ("entity_type", "entity_id");


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");


--
-- Name: idx_bids_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_bids_created_at" ON "public"."bids" USING "btree" ("created_at" DESC);


--
-- Name: idx_bids_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_bids_created_by" ON "public"."bids" USING "btree" ("created_by");


--
-- Name: idx_bids_tender_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_bids_tender_id" ON "public"."bids" USING "btree" ("tender_id");


--
-- Name: idx_org_members_organisation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_org_members_organisation_id" ON "public"."organisation_members" USING "btree" ("organisation_id");


--
-- Name: idx_org_members_profile_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_org_members_profile_id" ON "public"."organisation_members" USING "btree" ("profile_id");


--
-- Name: idx_organisations_cvr; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_organisations_cvr" ON "public"."organisations" USING "btree" ("cvr");


--
-- Name: idx_organisations_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_organisations_is_active" ON "public"."organisations" USING "btree" ("is_active");


--
-- Name: idx_organisations_type_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_organisations_type_code" ON "public"."organisations" USING "btree" ("type_code");


--
-- Name: idx_supplier_org_users_org_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_supplier_org_users_org_id" ON "public"."supplier_organisation_users" USING "btree" ("supplier_organisation_id");


--
-- Name: idx_supplier_org_users_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_supplier_org_users_user_id" ON "public"."supplier_organisation_users" USING "btree" ("user_id");


--
-- Name: idx_tender_documents_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_tender_documents_created_by" ON "public"."tender_documents" USING "btree" ("created_by");


--
-- Name: idx_tender_documents_tender_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_tender_documents_tender_id" ON "public"."tender_documents" USING "btree" ("tender_id");


--
-- Name: idx_tender_questions_asked_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_tender_questions_asked_by" ON "public"."tender_questions" USING "btree" ("asked_by");


--
-- Name: idx_tender_questions_published; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_tender_questions_published" ON "public"."tender_questions" USING "btree" ("is_published");


--
-- Name: idx_tender_questions_tender_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_tender_questions_tender_id" ON "public"."tender_questions" USING "btree" ("tender_id");


--
-- Name: idx_tenders_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_tenders_created_at" ON "public"."tenders" USING "btree" ("created_at" DESC);


--
-- Name: idx_tenders_organisation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_tenders_organisation_id" ON "public"."tenders" USING "btree" ("organisation_id");


--
-- Name: one_default_org_per_profile; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "one_default_org_per_profile" ON "public"."organisation_members" USING "btree" ("profile_id") WHERE ("is_default" = true);


--
-- Name: tender_documents_created_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tender_documents_created_by_idx" ON "public"."tender_documents" USING "btree" ("created_by");


--
-- Name: tender_documents_tender_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tender_documents_tender_id_idx" ON "public"."tender_documents" USING "btree" ("tender_id");


--
-- Name: uq_supplier_organisations_cvr; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "uq_supplier_organisations_cvr" ON "public"."supplier_organisations" USING "btree" ("cvr_number") WHERE ("cvr_number" IS NOT NULL);


--
-- Name: uq_supplier_organisations_foreign; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "uq_supplier_organisations_foreign" ON "public"."supplier_organisations" USING "btree" ("country_code", "foreign_id") WHERE ("foreign_id" IS NOT NULL);


--
-- Name: bids audit_bids; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "audit_bids" AFTER INSERT OR DELETE OR UPDATE ON "public"."bids" FOR EACH ROW EXECUTE FUNCTION "public"."audit_bid_change"();


--
-- Name: organisation_members audit_organisation_members; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "audit_organisation_members" AFTER INSERT OR DELETE OR UPDATE ON "public"."organisation_members" FOR EACH ROW EXECUTE FUNCTION "public"."audit_organisation_member_change"();


--
-- Name: organisations audit_organisations; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "audit_organisations" AFTER INSERT OR DELETE OR UPDATE ON "public"."organisations" FOR EACH ROW EXECUTE FUNCTION "public"."audit_organisation_change"();


--
-- Name: supplier_organisation_users audit_supplier_organisation_users; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "audit_supplier_organisation_users" AFTER INSERT OR DELETE OR UPDATE ON "public"."supplier_organisation_users" FOR EACH ROW EXECUTE FUNCTION "public"."audit_supplier_organisation_member_change"();


--
-- Name: supplier_organisations audit_supplier_organisations; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "audit_supplier_organisations" AFTER INSERT OR DELETE OR UPDATE ON "public"."supplier_organisations" FOR EACH ROW EXECUTE FUNCTION "public"."audit_supplier_organisation_change"();


--
-- Name: bids trg_bids_guard_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_bids_guard_insert" BEFORE INSERT ON "public"."bids" FOR EACH ROW EXECUTE FUNCTION "public"."guard_bid_insert"();


--
-- Name: bids trg_bids_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_bids_set_updated_at" BEFORE UPDATE ON "public"."bids" FOR EACH ROW EXECUTE FUNCTION "public"."bids_set_updated_at"();


--
-- Name: organisations trg_on_organisation_created; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_on_organisation_created" AFTER INSERT ON "public"."organisations" FOR EACH ROW EXECUTE FUNCTION "public"."on_organisation_created"();


--
-- Name: supplier_organisations trg_on_supplier_organisation_created; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_on_supplier_organisation_created" AFTER INSERT ON "public"."supplier_organisations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_supplier_organisation"();


--
-- Name: tender_documents trg_set_created_by; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_set_created_by" BEFORE INSERT ON "public"."tender_documents" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_by"();


--
-- Name: tenders trg_tenders_guard_deadline_and_status; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_tenders_guard_deadline_and_status" BEFORE UPDATE ON "public"."tenders" FOR EACH ROW EXECUTE FUNCTION "public"."guard_tender_deadline_and_status"();


--
-- Name: tenders trg_tenders_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_tenders_updated_at" BEFORE UPDATE ON "public"."tenders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: organisations update_organisations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "update_organisations_updated_at" BEFORE UPDATE ON "public"."organisations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: supplier_organisation_users update_supplier_organisation_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "update_supplier_organisation_users_updated_at" BEFORE UPDATE ON "public"."supplier_organisation_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: supplier_organisations update_supplier_organisations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "update_supplier_organisations_updated_at" BEFORE UPDATE ON "public"."supplier_organisations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: tender_questions update_tender_questions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "update_tender_questions_updated_at" BEFORE UPDATE ON "public"."tender_questions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: bids bids_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: bids bids_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: bids bids_tender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_tender_id_fkey" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE CASCADE;


--
-- Name: organisation_members organisation_members_organisation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."organisation_members"
    ADD CONSTRAINT "organisation_members_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE;


--
-- Name: organisation_members organisation_members_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."organisation_members"
    ADD CONSTRAINT "organisation_members_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: organisations organisations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."organisations"
    ADD CONSTRAINT "organisations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: organisations organisations_type_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."organisations"
    ADD CONSTRAINT "organisations_type_code_fkey" FOREIGN KEY ("type_code") REFERENCES "public"."organisation_types"("code");


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: supplier_organisation_users supplier_organisation_users_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."supplier_organisation_users"
    ADD CONSTRAINT "supplier_organisation_users_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: supplier_organisation_users supplier_organisation_users_supplier_organisation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."supplier_organisation_users"
    ADD CONSTRAINT "supplier_organisation_users_supplier_organisation_id_fkey" FOREIGN KEY ("supplier_organisation_id") REFERENCES "public"."supplier_organisations"("id") ON DELETE CASCADE;


--
-- Name: supplier_organisation_users supplier_organisation_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."supplier_organisation_users"
    ADD CONSTRAINT "supplier_organisation_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: supplier_organisations supplier_organisations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."supplier_organisations"
    ADD CONSTRAINT "supplier_organisations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: tender_documents tender_documents_tender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."tender_documents"
    ADD CONSTRAINT "tender_documents_tender_id_fkey" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE CASCADE;


--
-- Name: tender_questions tender_questions_asked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."tender_questions"
    ADD CONSTRAINT "tender_questions_asked_by_fkey" FOREIGN KEY ("asked_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: tender_questions tender_questions_tender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."tender_questions"
    ADD CONSTRAINT "tender_questions_tender_id_fkey" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE CASCADE;


--
-- Name: tenders tenders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."tenders"
    ADD CONSTRAINT "tenders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: audit_logs Buyers can view audit logs for owned tenders; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Buyers can view audit logs for owned tenders" ON "public"."audit_logs" FOR SELECT USING ((("entity_type" = 'tender'::"text") AND ("entity_id" IN ( SELECT "tenders"."id"
   FROM "public"."tenders"
  WHERE ("tenders"."entity_id" = ("auth"."uid"())::"text")))));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));


--
-- Name: profiles Users can read own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));


--
-- Name: audit_logs Users can view own audit logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own audit logs" ON "public"."audit_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: organisation_members admins_delete_members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admins_delete_members" ON "public"."organisation_members" FOR DELETE TO "authenticated" USING ((("organisation_id" IN ( SELECT "public"."get_my_admin_organisation_ids"() AS "get_my_admin_organisation_ids")) OR ("profile_id" = "auth"."uid"())));


--
-- Name: organisation_members admins_insert_members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admins_insert_members" ON "public"."organisation_members" FOR INSERT TO "authenticated" WITH CHECK (("organisation_id" IN ( SELECT "public"."get_my_admin_organisation_ids"() AS "get_my_admin_organisation_ids")));


--
-- Name: organisation_members admins_update_members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admins_update_members" ON "public"."organisation_members" FOR UPDATE TO "authenticated" USING (("organisation_id" IN ( SELECT "public"."get_my_admin_organisation_ids"() AS "get_my_admin_organisation_ids"))) WITH CHECK ((("organisation_id" IN ( SELECT "public"."get_my_admin_organisation_ids"() AS "get_my_admin_organisation_ids")) AND ("role" = ANY (ARRAY['admin'::"public"."organisation_member_role", 'editor'::"public"."organisation_member_role", 'viewer'::"public"."organisation_member_role"]))));


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: bids; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."bids" ENABLE ROW LEVEL SECURITY;

--
-- Name: bids bids_buyer_select_after_deadline; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "bids_buyer_select_after_deadline" ON "public"."bids" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tenders" "t"
  WHERE (("t"."id" = "bids"."tender_id") AND ("t"."organisation_id" IN ( SELECT "public"."get_my_organisation_ids"() AS "get_my_organisation_ids")) AND ("t"."submission_deadline" < "now"())))));


--
-- Name: bids bids_supplier_delete_before_deadline; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "bids_supplier_delete_before_deadline" ON "public"."bids" FOR DELETE TO "authenticated" USING ((("supplier_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."tenders" "t"
  WHERE (("t"."id" = "bids"."tender_id") AND ("t"."submission_deadline" > "now"()))))));


--
-- Name: bids bids_supplier_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "bids_supplier_select_own" ON "public"."bids" FOR SELECT TO "authenticated" USING (("supplier_id" = "auth"."uid"()));


--
-- Name: organisation_members members_view_same_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "members_view_same_org" ON "public"."organisation_members" FOR SELECT TO "authenticated" USING (("organisation_id" IN ( SELECT "public"."get_my_organisation_ids"() AS "get_my_organisation_ids")));


--
-- Name: organisation_types org_types_authenticated_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "org_types_authenticated_read" ON "public"."organisation_types" FOR SELECT TO "authenticated" USING (true);


--
-- Name: organisation_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."organisation_members" ENABLE ROW LEVEL SECURITY;

--
-- Name: organisation_types; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."organisation_types" ENABLE ROW LEVEL SECURITY;

--
-- Name: organisations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."organisations" ENABLE ROW LEVEL SECURITY;

--
-- Name: organisations orgs_admin_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "orgs_admin_update" ON "public"."organisations" FOR UPDATE TO "authenticated" USING (("id" IN ( SELECT "public"."get_my_admin_organisation_ids"() AS "get_my_admin_organisation_ids")));


--
-- Name: organisations orgs_authenticated_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "orgs_authenticated_insert" ON "public"."organisations" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));


--
-- Name: organisations orgs_member_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "orgs_member_select" ON "public"."organisations" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "public"."get_my_organisation_ids"() AS "get_my_organisation_ids")));


--
-- Name: organisations orgs_owner_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "orgs_owner_delete" ON "public"."organisations" FOR DELETE TO "authenticated" USING (("id" IN ( SELECT "public"."get_my_owner_organisation_ids"() AS "get_my_owner_organisation_ids")));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));


--
-- Name: tender_questions read_published_qna; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "read_published_qna" ON "public"."tender_questions" FOR SELECT USING (("is_published" = true));


--
-- Name: audit_logs service_role_insert_audit; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "service_role_insert_audit" ON "public"."audit_logs" FOR INSERT TO "service_role" WITH CHECK (true);


--
-- Name: supplier_organisation_users supplier_org_users_delete_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "supplier_org_users_delete_owner" ON "public"."supplier_organisation_users" FOR DELETE TO "authenticated" USING (("supplier_organisation_id" IN ( SELECT "public"."get_my_owner_supplier_organisation_ids"() AS "get_my_owner_supplier_organisation_ids")));


--
-- Name: supplier_organisation_users supplier_org_users_insert_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "supplier_org_users_insert_owner" ON "public"."supplier_organisation_users" FOR INSERT TO "authenticated" WITH CHECK (("supplier_organisation_id" IN ( SELECT "public"."get_my_owner_supplier_organisation_ids"() AS "get_my_owner_supplier_organisation_ids")));


--
-- Name: supplier_organisation_users supplier_org_users_select_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "supplier_org_users_select_member" ON "public"."supplier_organisation_users" FOR SELECT TO "authenticated" USING (("supplier_organisation_id" IN ( SELECT "public"."get_my_supplier_organisation_ids"() AS "get_my_supplier_organisation_ids")));


--
-- Name: supplier_organisation_users supplier_org_users_update_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "supplier_org_users_update_owner" ON "public"."supplier_organisation_users" FOR UPDATE TO "authenticated" USING (("supplier_organisation_id" IN ( SELECT "public"."get_my_owner_supplier_organisation_ids"() AS "get_my_owner_supplier_organisation_ids"))) WITH CHECK (("supplier_organisation_id" IN ( SELECT "public"."get_my_owner_supplier_organisation_ids"() AS "get_my_owner_supplier_organisation_ids")));


--
-- Name: supplier_organisation_users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."supplier_organisation_users" ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_organisations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."supplier_organisations" ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_organisations supplier_organisations_insert_self; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "supplier_organisations_insert_self" ON "public"."supplier_organisations" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));


--
-- Name: supplier_organisations supplier_organisations_select_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "supplier_organisations_select_member" ON "public"."supplier_organisations" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "public"."get_my_supplier_organisation_ids"() AS "get_my_supplier_organisation_ids")));


--
-- Name: supplier_organisations supplier_organisations_update_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "supplier_organisations_update_owner" ON "public"."supplier_organisations" FOR UPDATE TO "authenticated" USING (("id" IN ( SELECT "public"."get_my_owner_supplier_organisation_ids"() AS "get_my_owner_supplier_organisation_ids"))) WITH CHECK (("id" IN ( SELECT "public"."get_my_owner_supplier_organisation_ids"() AS "get_my_owner_supplier_organisation_ids")));


--
-- Name: tender_documents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."tender_documents" ENABLE ROW LEVEL SECURITY;

--
-- Name: tender_documents tender_documents_manager_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "tender_documents_manager_select" ON "public"."tender_documents" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tenders" "t"
  WHERE (("t"."id" = "tender_documents"."tender_id") AND (("t"."entity_id" = ("auth"."uid"())::"text") OR ("t"."organisation_id" IN ( SELECT "public"."get_my_organisation_ids"() AS "get_my_organisation_ids")))))));


--
-- Name: tender_documents tender_documents_public_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "tender_documents_public_select" ON "public"."tender_documents" FOR SELECT TO "authenticated", "anon" USING ((("is_public" = true) AND (EXISTS ( SELECT 1
   FROM "public"."tenders" "t"
  WHERE (("t"."id" = "tender_documents"."tender_id") AND ("t"."status" <> 'draft'::"text"))))));


--
-- Name: tender_questions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."tender_questions" ENABLE ROW LEVEL SECURITY;

--
-- Name: tenders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."tenders" ENABLE ROW LEVEL SECURITY;

--
-- Name: tenders tenders_manager_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "tenders_manager_select" ON "public"."tenders" FOR SELECT TO "authenticated" USING ((("entity_id" = ("auth"."uid"())::"text") OR ("organisation_id" IN ( SELECT "public"."get_my_organisation_ids"() AS "get_my_organisation_ids"))));


--
-- Name: tenders tenders_public_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "tenders_public_select" ON "public"."tenders" FOR SELECT TO "authenticated", "anon" USING (("status" <> 'draft'::"text"));


--
-- Name: SCHEMA "public"; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


--
-- Name: FUNCTION "audit_bid_change"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."audit_bid_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_bid_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_bid_change"() TO "service_role";


--
-- Name: FUNCTION "audit_organisation_change"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."audit_organisation_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_organisation_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_organisation_change"() TO "service_role";


--
-- Name: FUNCTION "audit_organisation_member_change"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."audit_organisation_member_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_organisation_member_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_organisation_member_change"() TO "service_role";


--
-- Name: FUNCTION "audit_supplier_organisation_change"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."audit_supplier_organisation_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_supplier_organisation_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_supplier_organisation_change"() TO "service_role";


--
-- Name: FUNCTION "audit_supplier_organisation_member_change"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."audit_supplier_organisation_member_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_supplier_organisation_member_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_supplier_organisation_member_change"() TO "service_role";


--
-- Name: FUNCTION "bids_set_updated_at"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."bids_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."bids_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."bids_set_updated_at"() TO "service_role";


--
-- Name: FUNCTION "get_bid_count_for_tender"("p_tender_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."get_bid_count_for_tender"("p_tender_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_bid_count_for_tender"("p_tender_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_bid_count_for_tender"("p_tender_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "get_bid_metadata_for_tender"("p_tender_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."get_bid_metadata_for_tender"("p_tender_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_bid_metadata_for_tender"("p_tender_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "get_my_admin_organisation_ids"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_my_admin_organisation_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_admin_organisation_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_admin_organisation_ids"() TO "service_role";


--
-- Name: FUNCTION "get_my_organisation_ids"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_my_organisation_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_organisation_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_organisation_ids"() TO "service_role";


--
-- Name: FUNCTION "get_my_owner_organisation_ids"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_my_owner_organisation_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_owner_organisation_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_owner_organisation_ids"() TO "service_role";


--
-- Name: FUNCTION "get_my_owner_supplier_organisation_ids"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_my_owner_supplier_organisation_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_owner_supplier_organisation_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_owner_supplier_organisation_ids"() TO "service_role";


--
-- Name: FUNCTION "get_my_supplier_organisation_ids"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_my_supplier_organisation_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_supplier_organisation_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_supplier_organisation_ids"() TO "service_role";


--
-- Name: FUNCTION "guard_bid_insert"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."guard_bid_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_bid_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_bid_insert"() TO "service_role";


--
-- Name: FUNCTION "guard_tender_deadline_and_status"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."guard_tender_deadline_and_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_tender_deadline_and_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_tender_deadline_and_status"() TO "service_role";


--
-- Name: FUNCTION "handle_new_supplier_organisation"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."handle_new_supplier_organisation"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_supplier_organisation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_supplier_organisation"() TO "service_role";


--
-- Name: FUNCTION "handle_new_user"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


--
-- Name: FUNCTION "on_organisation_created"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."on_organisation_created"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_organisation_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_organisation_created"() TO "service_role";


--
-- Name: FUNCTION "set_bids_updated_at"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."set_bids_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_bids_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_bids_updated_at"() TO "service_role";


--
-- Name: FUNCTION "set_created_by"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."set_created_by"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_created_by"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_created_by"() TO "service_role";


--
-- Name: FUNCTION "set_updated_at"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


--
-- Name: TABLE "bids"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."bids" TO "anon";
GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."bids" TO "authenticated";
GRANT ALL ON TABLE "public"."bids" TO "service_role";


--
-- Name: FUNCTION "update_bid_status"("p_bid_id" "uuid", "p_new_status" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."update_bid_status"("p_bid_id" "uuid", "p_new_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_bid_status"("p_bid_id" "uuid", "p_new_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_bid_status"("p_bid_id" "uuid", "p_new_status" "text") TO "service_role";


--
-- Name: FUNCTION "update_updated_at_column"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


--
-- Name: TABLE "audit_logs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";


--
-- Name: TABLE "organisation_members"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."organisation_members" TO "anon";
GRANT ALL ON TABLE "public"."organisation_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organisation_members" TO "service_role";


--
-- Name: TABLE "organisation_types"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."organisation_types" TO "anon";
GRANT ALL ON TABLE "public"."organisation_types" TO "authenticated";
GRANT ALL ON TABLE "public"."organisation_types" TO "service_role";


--
-- Name: TABLE "organisations"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."organisations" TO "anon";
GRANT ALL ON TABLE "public"."organisations" TO "authenticated";
GRANT ALL ON TABLE "public"."organisations" TO "service_role";


--
-- Name: TABLE "profiles"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";


--
-- Name: TABLE "supplier_organisation_users"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."supplier_organisation_users" TO "anon";
GRANT ALL ON TABLE "public"."supplier_organisation_users" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_organisation_users" TO "service_role";


--
-- Name: TABLE "supplier_organisations"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."supplier_organisations" TO "anon";
GRANT ALL ON TABLE "public"."supplier_organisations" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_organisations" TO "service_role";


--
-- Name: TABLE "tender_documents"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."tender_documents" TO "anon";
GRANT ALL ON TABLE "public"."tender_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."tender_documents" TO "service_role";


--
-- Name: TABLE "tender_questions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."tender_questions" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."tender_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."tender_questions" TO "service_role";


--
-- Name: COLUMN "tender_questions"."id"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT("id") ON TABLE "public"."tender_questions" TO "anon";
GRANT SELECT("id") ON TABLE "public"."tender_questions" TO "authenticated";


--
-- Name: COLUMN "tender_questions"."tender_id"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT("tender_id") ON TABLE "public"."tender_questions" TO "anon";
GRANT SELECT("tender_id") ON TABLE "public"."tender_questions" TO "authenticated";


--
-- Name: COLUMN "tender_questions"."question_text_public"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT("question_text_public") ON TABLE "public"."tender_questions" TO "anon";
GRANT SELECT("question_text_public") ON TABLE "public"."tender_questions" TO "authenticated";


--
-- Name: COLUMN "tender_questions"."answer_text"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT("answer_text") ON TABLE "public"."tender_questions" TO "anon";
GRANT SELECT("answer_text") ON TABLE "public"."tender_questions" TO "authenticated";


--
-- Name: COLUMN "tender_questions"."is_published"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT("is_published") ON TABLE "public"."tender_questions" TO "anon";
GRANT SELECT("is_published") ON TABLE "public"."tender_questions" TO "authenticated";


--
-- Name: COLUMN "tender_questions"."created_at"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT("created_at") ON TABLE "public"."tender_questions" TO "anon";
GRANT SELECT("created_at") ON TABLE "public"."tender_questions" TO "authenticated";


--
-- Name: COLUMN "tender_questions"."updated_at"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT("updated_at") ON TABLE "public"."tender_questions" TO "anon";
GRANT SELECT("updated_at") ON TABLE "public"."tender_questions" TO "authenticated";


--
-- Name: TABLE "tenders"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."tenders" TO "anon";
GRANT ALL ON TABLE "public"."tenders" TO "authenticated";
GRANT ALL ON TABLE "public"."tenders" TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- PostgreSQL database dump complete
--



-- ===== SLUT: prod-public.sql =====

-- Trigger på auth.users (ligger uden for public-dumpet). Opretter profil ved signup.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage-buckets. Kun de kolonner, platformen lader os eje; tidsstempler og
-- lifecycle/versioning styres af Storage-tjenesten.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('tender-docs', 'tender-docs', false, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('bid-documents', 'bid-documents', false, NULL, NULL) ON CONFLICT (id) DO NOTHING;

-- Stamdata: organisationstyper.
INSERT INTO public.organisation_types (code, name_da, name_en, description_da, regulatory_reference, requires_cvr, created_at) VALUES ('housing_association', 'Alment boligselskab', 'Housing association', 'Almene boligselskaber er omfattet af udbudspligten som offentligretlige organer og er underlagt særregler i almenboligloven samt Landsbyggefondens krav.', 'Almenboligloven + udbudslovens §24, nr. 28', true, '2026-04-28 08:01:47.258331+00') ON CONFLICT DO NOTHING;
INSERT INTO public.organisation_types (code, name_da, name_en, description_da, regulatory_reference, requires_cvr, created_at) VALUES ('municipality', 'Kommune', 'Municipality', 'Kommuner er klassiske offentlige ordregivere omfattet af udbudslovens afsnit II og III for udbud over og under EU-tærskelværdierne.', 'Udbudslovens afsnit II/III (LBK nr. 116 af 03/02/2025)', true, '2026-04-28 08:01:47.258331+00') ON CONFLICT DO NOTHING;
INSERT INTO public.organisation_types (code, name_da, name_en, description_da, regulatory_reference, requires_cvr, created_at) VALUES ('public_body_other', 'Andet offentligretligt organ', 'Other public body', 'Selvstændig juridisk person der opfylder almene behov af ikke-industriel eller kommerciel karakter, og som finansieres eller kontrolleres af det offentlige.', 'Udbudslovens §24, nr. 28', true, '2026-04-28 08:01:47.258331+00') ON CONFLICT DO NOTHING;

-- Dumpet sætter search_path tomt på sessionsniveau; nulstil før næste migration.
RESET ALL;

COMMIT;
