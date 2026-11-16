# SESSION_NOTES.md

Denne fil bevares som kontinuitet mellem AI-assisterede arbejdssessioner. Læs den ved start af hver ny session sammen med CLAUDE.md.

**Sidst opdateret:** 16. november 2026
**Sidst aktive session:** 16. november 2026 (Sprint A2: CI, A5: baseline, A3: npm audit)

---

## 16. november 2026

**Sprint A2: CI (commit `1e54e84`):**
- `.github/workflows/ci.yml`: kører på pull_request og push til main. Node låst til 24. Trin: `npm ci`, lint, typecheck, build.
- Build i CI bruger kun to dummy-værdier (`NEXT_PUBLIC_SUPABASE_URL=https://ci-dummy.invalid`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Ingen secrets. Alle øvrige env-variabler er valgfrie ved build.
- `scripts/gen-types.mjs`: `--project-id` erstattet af `--remote=<ref>` med eksplicit projekt-ref; kommandoen bygges som én streng (fjerner DEP0190).
- `.gitignore`: linjen `public` fjernet, så en fremtidig `public/`-mappe kommer med i git.

**Verificeret:** lint (2 advarsler, 0 fejl), typecheck og build grønne lokalt 16. nov. Første kørsel i GitHub Actions grøn.

**Ikke bekræftet:** om `db:types:dry` gav byte-identisk output før og efter rettelsen i `gen-types.mjs`. Sessionen 12. nov. blev afbrudt før slutrapporten. Kør `npm run db:types:dry` én gang som kontrol.

**Åbne punkter:**
- To `react-hooks/exhaustive-deps`-advarsler i `PublicationButton.tsx` og `QnAModerationPanel.tsx`.
- Ingen branch protection på `main` endnu; CI er kun vejledende.
- Forældede browserdata (`caniuse-lite`, `baseline-browser-mapping`) ryddes op i A3.

**Sprint A5: baseline af produktionsskemaet (`supabase/migrations/20261116120000_baseline_prod.sql`):**
- Dump taget 16. nov. med pg_dump 18.7 (klientværktøjer i `C:\Program Files\PostgreSQL\18\bin`) via session-pooleren fra produktion (Postgres 17.4). Filer i `scripts/sql/output/baseline/` (git-ignoreret). DB-password nulstillet samme dag.
- Baseline bygges af `scripts/build-baseline.mjs`. Filen genereres og redigeres ikke i hånden. Scriptet kopierer linjer byte for byte (130 CRLF-linjer i funktionskroppe bevaret) og kontrollerer, at output = input minus fjernede linjer.
- Fjernet (660 af 2811 linjer): `\restrict`/`\unrestrict`, 4 extensions, publikationen `supabase_realtime`, 6 event triggers, ACL i `extensions` (51) og `vault` (5), default privileges for `supabase_admin`.
- Tilføjet: vagt der afbryder hvis `public.tenders` findes, én transaktion om hele filen, trigger `on_auth_user_created` på `auth.users`, buckets `tender-docs` og `bid-documents`, tre rækker i `organisation_types`, `RESET ALL`.
- Filen fjerner først postgres' default privileges i public og genopretter dem til sidst. Uden det ville en frisk Supabase-database give anon/authenticated INSERT/UPDATE på `bids`, fuld SELECT på `tender_questions` og EXECUTE på de to bids-RPC'er.
- **Må aldrig eksekveres i produktion.** Dér markeres den kun som kørt (`supabase migration repair --status applied 20261116120000`), og først når staging er verificeret.
- De ti tidligere filer og `migrations_old/` ligger i `supabase/migrations_archive/` (historik, matcher ikke produktion).
- Nyt `scripts/sql/schema-fingerprint.sql` (read-only): triggere på auth/storage, storage-policies, buckets, extensions, publikationer, default ACLs, ejere i public, event triggers, cron.job.
- `.gitattributes`: baseline-filen er markeret `-text`, så git ikke normaliserer de blandede linjeskift.

**Verificeret (A5):** scriptets kontrol OK (sha256 `bad86bb3…0a9c86`), typecheck 0 fejl, build grønt. Baseline prøvekørt 16. nov. i en tom PGlite (Postgres 18.6) med stub af Supabases roller og skemaerne auth/storage: kører igennem i én transaktion; 11 tabeller, 32 policies, 16 triggere, RLS på alle; skrivelås på `bids`, kolonnelås på `tender_questions` og EXECUTE-låsene holder; default ACL identisk før og efter; vagten afbryder anden kørsel; `handle_new_user` opretter profil; `diagnose-rls.sql` (0 røde flag, nøgle 11-13 som i produktion) og `schema-fingerprint.sql` kører.

**Ikke verificeret (A5):** kørsel mod en rigtig Supabase-instans på Postgres 17. Det sker i trin 7-9 (staging + dump-diff mod produktion).

**Historik-tabellen i produktion** (`supabase_migrations.schema_migrations`) kender kun de syv første versioner; `20260528092910`, `20261018120000` og `20261112120000` er kørt i SQL Editor og står der ikke.

**Fundet i dumpet, ikke i nogen migration:** funktionerne `set_updated_at()` og `set_bids_updated_at()` (ubrugt); triggerne `trg_tenders_updated_at` og `trg_set_created_by`; indekserne `idx_bids_created_at`, `idx_bids_tender_id`, `idx_tenders_created_at` samt dubletterne `tender_documents_created_by_idx` og `tender_documents_tender_id_idx`; fem policies fra Cursor-perioden uden `TO` på `profiles` og `audit_logs`. Tabellen `leads` findes ikke.

**Åbne punkter fra A5:**
- 🔴 `bids_status_check` tillader `submitted, under_review, accepted, rejected`, men `update_bid_status()` sætter `under_evaluation, accepted, rejected, winner, not_awarded`: tre af fem statusser afvises af constrainten. `tenders_status_check` tillader `draft, published, closed, awarded`, mens `src/lib/tenders/types.ts` også har `prequalification, bidding, evaluation, cancelled`. Rettes i egen migration som første opgave i Sprint B.
- `search_path`: `set_bids_updated_at`, `set_created_by`, `set_updated_at` og `update_updated_at_column` har ingen; `handle_new_user` (SECURITY DEFINER) har `public` uden `pg_temp`.
- Ryd op i dublet-policies på `profiles` og dublet-indekser på `tender_documents`; `audit_logs`-policyen bruger stadig `entity_id`.
- `supabase db push`, `migration list` og `migration repair` er ikke afprøvet uden Docker i CLI 3.1.0. Nødudgang: `psql --single-transaction -f` plus `repair`.
- pg_graphql er ikke installeret i produktion, men er det på nye Supabase-projekter.
- CLAUDE.md, afsnittet om `migrations_old/`, skal opdateres.
**Sprint A3: npm audit på Next 14.2.x:**
- `next` 14.2.32 → 14.2.35 og `eslint-config-next` 14.2.5 → 14.2.35 (ranges `^14.2.35`). `npm audit fix` uden `--force`: 44 lock-ændringer, ingen major-spring (bl.a. resend 6.38.1, ws 8.23.0, postcss 8.5.33 på topniveau, js-yaml 4.3.2). caniuse-lite opdateret.
- `next.config.js`: `images.unoptimized: true`, `images.domains` med pladsholder fjernet (next/image bruges ikke i `src`).
- `npm audit` målt 16. nov.: 28 (1 kritisk, 19 høje, 7 moderate, 1 lav) → 14 (1 kritisk, 11 høje, 1 moderat, 1 lav).
- Tilbage: `next` (kritisk; lukkes først af 16.4.x), postcss inde i next, zod 3 (kræver zod 4), eslint-kæden og @typescript-eslint 6 (kun udvikling), esbuild via tsx (lav).

**Verificeret (A3):** lint (0 fejl, 2 advarsler), typecheck og build grønne lokalt, også build efter sletning af `.next` (fontene hentes igen uden fejl). `npm ci` i ren kopi ændrer ikke lockfilen.

**Afklaret (A3):** build i Claude Codes rene kopi fejlede i `next/font` (Google Fonts-loader). Det skyldtes netværket i dens miljø, ikke opgraderingen.

**Åbne punkter fra A3:**
- 🔴 A3b: opgradering direkte til Next 16. Next 14 er ude af support, og 15.x får kun sikkerhedsrettelser til 31. jan. 2027 (nextjs.org/support-policy, slået op 16. nov.). Omfatter React 19, asynkrone `cookies()`/`params` (30 kald i 15 filer plus 11 sider og route handlers), ESLint 9 med flat config og @typescript-eslint 8, @supabase/ssr `getAll`/`setAll`, Node ≥ 20.9, `useFormState` → `useActionState` i 4 auth-sider. Skøn 2-4 dage. Skal ligge før A4 og Sprint B.
- Den kritiske Next-advisory kræver `sharp` (ikke installeret) eller Windows-hosting; lokal `next dev` på Windows er i princippet omfattet, indtil A3b er gennemført.
- Ubrugte zod-skemaer i `src/lib/validations/` (`supplierRegistrationSchema`, `supplierProfileSchema`, `supplierSearchSchema`, `tenderFilterSchema`) slettes i A3b. zod 4 er en separat beslutning.
- Build advarer om, at `@supabase/supabase-js` bruger Node-API'er i Edge Runtime via `src/middleware.ts`. Forsvinder, hvis middleware flyttes til `proxy` i Next 16.
**Status Sprint A:** A1, A2 og A3 lukket. A5 trin 0-6 lukket (baseline bygget og prøvekørt); trin 7-10 (staging, verifikation, historik i produktion) venter på nyt selskab. Næste: A3b (Next 16), derefter A4 (Sentry). Plan: `claude/PILOTPLAN.md` i claude.ai-projektet.

---

## 12. november 2026

**Bids skrivelås (migration `20261112120000_bids_column_lock.sql`):**
- Tilbudsgiver kunne via PostgREST sætte `status='winner'` eller ændre `documents`, `tender_id`, `supplier_id` og `submitted_at` (UPDATE, eller DELETE + INSERT) → klienten har ikke længere INSERT/UPDATE på `bids`; policies `bids_supplier_insert` og `bids_supplier_update_before_deadline` droppet. Al skrivning via `POST /api/bids` (service-role) og `update_bid_status()`.
- Frist og status håndhæves nu i databasen: `trg_bids_guard_insert` (alle roller) afviser med 22023 og stempler `status` + `submitted_at`.
- Unik-indeks `bids_tender_supplier_unique` på `(tender_id, supplier_id)` (0 dubletter verificeret før kørsel).
- `get_bid_metadata_for_tender()` udleverede `supplier_id`/`submitted_at` til ordregiver før fristen → EXECUTE fjernet for klient-roller; erstattet af `get_bid_count_for_tender()` (kun antal) via `src/lib/bids/count.ts`.
- Dedikeret `trg_bids_set_updated_at` erstatter den eksisterende `trg_bids_updated_at`.
- `diagnose-rls.sql` udvidet med nøgle 11-13.

**Verificeret:** typecheck 0 fejl, build grønt.

**Kørt i Supabase 12. nov.:** diagnose (før) → migration → diagnose (efter). Før/efter i `scripts/sql/output/` (git-ignoreret). Nøgle 11: alle otte skriveprivilegier false. Nøgle 12: kun `ny_count:authenticated` true. Nøgle 13: triggerne `audit_bids`, `trg_bids_guard_insert`, `trg_bids_set_updated_at` og indekset `bids_tender_supplier_unique`. Røde flag 0. `npm run db:types` kørt (kun den nye RPC + kosmetik), typecheck 0 fejl. Commits `fe2d76a..f204ad4` pushet.

**Afvigelse fundet i live-DB:** `updated_at`-triggeren på `bids` hed `trg_bids_updated_at` (funktion `set_bids_updated_at()`), ikke `update_bids_updated_at` som i `migrations_old/001`. Migrationen dropper nu begge navne. Funktionen `set_bids_updated_at()` ligger tilbage ubrugt.

**Lokalt værktøj:** `npm run db:types` kræver, at Supabase-CLI'en er hentet (`npx --yes supabase --version`), ellers fejler scriptet på npx's installationsspørgsmål. `scripts/gen-types.mjs` giver to advarsler (`--project-id` forældet, DEP0190), som skal ryddes op.

**Åbne punkter:**
- `DELETE /api/bids/[id]` mangler: et afgivet tilbud kan kun trækkes tilbage via direkte PostgREST-DELETE, og filer i `bid-documents` bliver forældreløse. Skal bygges, før tilbudsgivere kan rette et tilbud i UI.
- Insert-triggeren gælder også service-role og SQL Editor: seed-/testdata med tilbud på lukkede udbud kræver `ALTER TABLE public.bids DISABLE TRIGGER trg_bids_guard_insert` omkring indsættelsen.
- Unik-indekset skal erstattes af `(tender_id, supplier_organisation_id)` i #5 bids-refactor.

---

## 18. oktober 2026

**Oprydning:** `scripts/oprydning-2026-10-18.ps1` fjernede 117 filer (død kode fra Cursor-perioden, legacy-ruter `/buyer`, `/supplier`, `/dashboard` m.fl., rod-Markdown). Typecheck 0 fejl, build grønt.

**Showstoppers lukket (migration `20261018120000_pilot_security_hardening.sql`):**
- Kladde-udbud og dokumenter var læsbare for anon (`USING true`) → kun ikke-kladder/`is_public`
- Spørgers identitet i `tender_questions` var læsbar for alle → kolonne-lås
- Klient kunne INSERT/UPDATE `tenders` og skrive `tender_documents` med vilkårlig `storage_path` → al skrivning via API (service-role); API validerer sti-prefix
- Tilbudsfrist kunne fremrykkes efter publicering (brød forsegling) → trigger
- Tilbudspriser i `audit_logs` → fjernet; alle buckets private, `bid-documents` oprettet

**Kørt i Supabase:** migration → `scripts/sql/seed-testorganisation.sql` (Test Boligselskab, CVR 99999999; 3 udbud tilknyttet) → diagnose. Før/efter i `scripts/sql/output/` (git-ignoreret): røde flag 2 → 0, policies 41 → 34, udbud uden org 3 → 0, audit-priser 0.

**Smoketest (uden login):** `/tenders` 200, kladde-dokumenter 404, publicerede dokumenter/Q&A 200 uden persondata, `/api/bids` 401, publish 401, `/ordregiver` 307 → `/login`, `/buyer` 308 → `/ordregiver`.

**Afventer:** ERST-overflytning til nyt CVR (OCES3-certifikat + tokenserver-spec, sag #164788). Publicering er deaktiveret (501) indtil eForms UBL XML + `publication_events`.

**Næste skridt:** fase 1 i pilotplanen (inkl. kontrolleret Next-opgradering for npm audit).

---

## Hvor vi står lige nu

### ✅ 26. maj — Alle 14 schema-designbeslutninger låst

Komplet liste:

**P1: Reference #9 — DKUDBUD lokal sync (6 underspørgsmål)**
1. Scope: DKUDBUD + eget-publicerede, forenet (TED udskudt til v2)
2. Sync-strategi: Pull-cron only i v1; webhook forward-compatible
3. Frekvens: 30 min default (env-justerbar); B1 (fuld refresh) → B3 (hybrid) når from-parameter bekræftet; soft-delete via status-enum + nattlig backstop
4. Retention: Ingen grænse
5. Indekserings-strategi: tsvector + GIN med danish-config; pg_trgm udskudt
6. Forenet vs. separat: notices som denormaliseret søge-indeks; tenders forbliver sandhedskilde

**P2: Reference #8 — procurement notifications (6 underspørgsmål + udvidelser)**
- 8.1 Datamodel: én tabel procurement_notifications + typed JSONB via zod-validering; standstill_end udeladt fra enum
- 8.2 Modtager-model: to-lags (notification_recipients + notification_deliveries); platform-inbox = juridisk kanal, email = trigger med link til inbox
- 8.3 Samtidighed: atomic transaction-RPC + preview-confirm UX; state-machine draft → pending_send → sent
- 8.4 Modtagelses-tracking: standard SMTP + inbox-view; ingen pixel; ingen tvungen anerkendelse; klagefrist forankret i legal_received_at
- 8.5 Standstill: fase i tender_phases; auto for over-tærskel award med eksplicit fravælg muligt; ingen § 170-standstill; ingen tilbudsgiver-flagging; 10 dages standstill ved elektronisk levering
- 8.6 Genererings-flow: template + AI-assist + custom org-templates + dokument-vedhæftninger (Variant 3 — inline-body med compliance-validering + shared/individual attachments)

**Plus genåbninger fra 18. maj Rute C:**
- supplier_id = user.id ERSTATTET af fuld virksomheds-model (supplier_organisations + supplier_organisation_users + tender_participants)
- UI-baseret winner-håndtering ERSTATTET af atomic award_bid-RPC med awarded_bid_id på tender_lots

### 🔴 26. maj — SCHEMA-DESIGN.md kom IKKE på disk

Claude Code's Write-tool reproducerede systematisk duplikat-fejl på sync_state-blokken (linje 534-535) i 3 forsøg:
- Forsøg 1: Monolitisk write af hele dokumentet
- Forsøg 2: To-fils split (p1.txt + p2.txt) med Node concatenation
- Forsøg 3: Isoleret p2.txt (68 linjer) med eksplicit raw-preview-verifikation

Alle 3 forsøg producerede identisk duplikat af "last_error text NULLABLE" og "consecutive_error_count int DEFAULT 0" på samme linjer. Sessionsstop besluttet efter 3. forsøg.

Hele dokumentindholdet er låst og bevaret i 26. maj-chathistorikken. Skal skrives til disk 27. maj med alternativ tilgang.

### 🔴 27. maj — Duplikat-fejl reproduceret igen på SESSION_NOTES.md-update

Ved første forsøg på 27. maj-opdatering af SESSION_NOTES.md via Claude Code's Write-tool blev duplikat-fejlen reproduceret på linje 156-157 ("### Prioritet 6: Compliance-tjek" + blank linje fordoblet). 

**Diagnose:** Fejlen sidder i Claude Code's interne text-generation-buffer, ikke i Write-tool eller PowerShell-laget. PowerShell-workaround [System.IO.File]::WriteAllText kan derfor ikke løse problemet — fejlen opstår før indholdet rammer disk-skrivnings-laget.

**Bevis-grundlag:** To forskellige filer (SCHEMA-DESIGN.md 26. maj og SESSION_NOTES.md 27. maj) på to forskellige sessioner med samme mønster (duplikering af 2 sammenhængende linjer i sidste tredjedel af dokumentet).

**Workaround der virker:** Manuel copy-paste fra Claude.ai-chathistorikken (hovedchat, ikke Claude Code) til VS Code. Claude.ai-text-generation kan levere indhold til chat-output uden duplikat-fejlen.

### ✅ 26. maj — ERST-mail klar til afsendelse

6 punkter til system@udbud.dk:
1. Inkremental sync (from-parameter på fraKilde-endpoint?)
2. Rate limits og anbefalede sync-frekvenser
3. Webhook/push-mekanisme — eksisterer eller på roadmap?
4. Notice-status livscyklus (rettelser, annulleringer, status-enum)
5. CPV-koder (flad vs. hierarkisk, traversering)
6. PROD-ibrugtagning prerequisites (credentials bekræftet identiske med PREPROD)

Mailen er klar; Frederik sender via egen email-klient. Senest 27. maj.

### ✅ 26. maj — Vercel Pro-beslutning truffet

Pro-upgrade ($20/måned) senest 8. juni før pilot. Begrundelse:
- Hobby er non-commercial only; pilot-kunder = kommerciel brug
- Pro tillader cron-frekvenser hver minut (Hobby: kun 1x daglig); kritisk for #9 sync-frekvens 30 min
- Pro inkluderer 1M function invocations + 1TB bandwidth (Hobby: 100K/100GB)
- Forenkler test af cron-flow inden pilot

Alternativ Supabase pg_cron + Vercel Hobby teknisk mulig men forhindret af commercial-use-restriktion.

### ✅ Tidligere arbejde stadig gyldigt

- Database-fundament: 4 migrations pushed
- P1: Udbud.dk env-bevidst client med OIDC token-flow (5 commits, 13. maj)
- ERST PREPROD-credentials virker, PROD-adgang tildelt og credentials bekræftet identiske
- P1-client audit gennemført 19. maj (8 ⚠️-fund, ingen 🔴-kritiske bugs, dokumenteret i docs/P1-CLIENT-AUDIT-2026-05-19.md)
- Rute C færdig (commits 49a90e1, 772a238, 25e15d6 — 18. maj)
- Branch cursor-automation slettet, main er nu primær (28 commits bevaret via fast-forward, 19. maj)
- scripts/gen-types.mjs virker uden BOM-problem (commit 482814b, 20. maj)
- Smoke-test mod ERST PREPROD bestået (DKE3 + DKE0, 18. maj)
- ERST bekræftede 21. maj: ingen søge-API; periodisk sync via fraKilde/DKUDBUD er anbefalet arkitektur

---

## Det vigtigste at vide før næste session

### 🔴 P0 næste session: Få SCHEMA-DESIGN.md på disk

Dokumentindhold er låst i 26. maj-chathistorikken. Skal skrives via manuel copy-paste fra Claude.ai-hovedchat til VS Code — Claude Code-tool-baseret skrivning er **ikke** mulig pga. reproduceret duplikat-fejl på to forskellige filer.

**Anbefalet tilgang (testet 27. maj):**
- Bed Claude.ai-hovedchat levere SCHEMA-DESIGN.md-indhold som ren tekst-blok i chat
- Frederik copy-paster ind i VS Code som ny fil docs/SCHEMA-DESIGN.md
- Gem som UTF-8 uden BOM (verificer i VS Code statusbar)
- Verificer med PowerShell: linjeantal, BOM-check (`Get-Content -Encoding Byte -TotalCount 3` → ikke 239,187,191), spot-check af æøå
- Commit manuelt

**Indhold:** Cross-cutting sektion + 8 references (#1, #2, #3, #4, #5, #6, #8, #9) med 7-felt-struktur (Status / Konflikt-risiko / Kode-referencer / Brugerhistorie / Designvalg / Beslutning / Opfølgning) + afhængighedsgraf + åbne punkter + revisions-historik.

Estimat: 15-20 min med manuel copy-paste.

### 🔴 CLAUDE.md-opdatering booket til 27. maj (Mulighed A, delta-opdatering til v2.2)

Skal indlejre BÅDE #1-#8-beslutningerne OG #9 på én gang. Skal ske EFTER SCHEMA-DESIGN.md er låst på disk. Samme manuel copy-paste-tilgang som SCHEMA-DESIGN.md.

### 🟠 Pilot 8. juni-realisme — 12 dage tilbage

Revideret arbejdsplan:
- 27. maj: SCHEMA-DESIGN.md på disk + send ERST-mail + CLAUDE.md v2.2 (2-3 timer med manuel copy-paste-disciplin)
- 28.-31. maj: Migrationer skrives og testes (rækkefølge fastlagt i SCHEMA-DESIGN.md)
- 1.-3. juni: types.ts-regenerering + kaskade-fix
- 4.-7. juni: UI-arbejde + Vercel Pro-upgrade + compliance-tjek
- 8. juni: Pilot-møde

Stadig stramt men ikke umuligt. Hvis 27. maj-blokken kører over, vurderes om UI eller compliance prioriteres højest.

### 🔴 P1-client audit-opfølgning stadig udestående

Inspect-only verifikation af udbud-dk-client.ts (token-URL grant_type, SDK-version-format, token-cache global mutable state). Detaljeret i docs/P1-CLIENT-AUDIT-2026-05-19.md. Estimat: 15-30 min. Ikke kritisk før migrations-fasen.

### 🔴 Payload-format mismatch er stadig blocker for service.ts → PROD

UdbudDKPayload returnerer fladt JSON, ERST forventer eForms UBL XML. service.ts har TODO. Payload-builder-rewrite (estimat 3-4 timer) udestår. Bør tackles før første reelle PROD-publicering.

### 🟠 Innobooster periode 3: åbner 27. maj, lukker 6. august 2026

Verificeret 20. maj. Optimal timing. Bør dedikere session til ansøgningsarbejde i juni når pilot er overstået. Kapital-injektion-status til ApS (100.000 DKK-tærskel) skal verificeres som del af ansøgningsforberedelse.

### 🟠 Compliance-status stadig usikker

DPA'er, ZDR-aktivering, privatlivspolitik, vilkår, tilgængelighedserklæring — ikke berørt 26. maj. Påkrævet før onboarding af reelle brugere.

---

## Næste session — prioriteret to-do

### Prioritet 0: SCHEMA-DESIGN.md på disk

Manuel copy-paste fra Claude.ai-hovedchat. Se "P0 næste session" ovenfor.

### Prioritet 1: Send ERST-mail

6 punkter, klar fra 26. maj. Estimat: 2-5 min.

### Prioritet 2: CLAUDE.md-opdatering til v2.2

Indlejr #1-#8 + #9 beslutninger. Estimat: 30-60 min via manuel copy-paste.

### Prioritet 3: Start migrations-skrivning

Baseret på SCHEMA-DESIGN.md cross-cutting sektion 1.4 (migrations-rækkefølge). Begynd med #5 fundament (supplier_organisations + supplier_organisation_users).

### Prioritet 4: P1-client audit-opfølgning

Inspect-only verifikation af udbud-dk-client.ts. Estimat: 15-30 min.

### Prioritet 5: Payload-builder XML-rewrite

UdbudDKPayload → eForms UBL XML. Estimat: 3-4 timer.

### Prioritet 6: Compliance-tjek

Menneske-arbejde. Status-check af DPA'er, ZDR, juridisk indhold. Bør tackles før pilot.

---

## Designvalg låst i Rute C (18. maj) — opdateret med 20. + 26. maj-genåbninger

Disse beslutninger er kode og bør IKKE genåbnes uden eksplicit grund:

- RPC = single source of truth for autorisering på evaluate-flow
- evaluation_notes-feltet er droppet, ikke genintroduceret
- Status-whitelist for evaluator: under_evaluation, accepted, rejected, winner, not_awarded (5 værdier)
- SQLSTATE-mapping: 42501 → 403, 22023 → 400
- URL-konsistens (bid hører til tender) check'es IKKE i evaluate-route
- getUserRole returnerer 'owner' for profiles.role='buyer'

**⚠️ Genåbnet 20. + 26. maj — IKKE længere gyldigt fra 18. maj:**

- ~~Tender-state-opdatering skrives IKKE fra evaluate-route. UI udleder state fra bids~~ — ERSTATTET af #6: award_bid-RPC opdaterer atomisk; awarded_bid_id er førsteklasses på tender_lots
- ~~Winner → bulk mark losers as not_awarded gøres IKKE atomisk fra evaluate-route~~ — ERSTATTET af #6: award_bid-RPC håndterer atomisk
- ~~getSupplierId returnerer userId direkte (supplier_id = user.id i ny model)~~ — ERSTATTET af #5: returnerer supplier_organisation_id

---

## Arbejdsmønstre — opdateret 26. + 27. maj

### Tilføjelser til "Arbejdsmønstre der virker"

1. **Rute C-protokol for designsamtaler** (20. + 26. maj) — én reference ad gangen, eksplicit STOP mellem hver, ny evidens kræves for genåbning af tidligere beslutninger. Bestod 14 underspørgsmål i to sessioner uden drift.
2. **Brutal ærlighed på modargumenter** (26. maj) — selv når Frederik signalerede præference (fx "standstill skal kunne fravælges"), stress-testede Claude præmissen via fire eksplicitte modargumenter inden beslutning. Det undgår design-drift drevet af bekvemmelighed.
3. **Eksplicit STOP-punkter mellem hver underspørgsmål** (26. maj) — gjorde det muligt at fange duplikat-fejl tidligt og afslutte sessionen disciplineret efter 3 fejlede write-attempts i stedet for at presse en fjerde gang.
4. **Beslutnings-niveau-QA frem for kode-niveau-QA** (26. maj) — Frederik kvalitetssikrer at beslutninger er afspejlet i dokumentet, IKKE DDL-skitser linje-for-linje. Migrations-fasen er der hvor faktisk kode bliver til.
5. **Workaround-disciplin** (26. maj) — når Claude Code's standard-tool reproducerer fejl, vælges anden code path frem for retry af samme tool. **Korrektion 27. maj:** PowerShell-workaround virker IKKE for duplikat-fejlen (fejlen er upstream i text-generation). Manuel copy-paste fra Claude.ai-hovedchat er eneste verificerede løsning.
6. **Diagnostik via krydsfilstest** (27. maj) — duplikat-fejl reproduceret på to forskellige filer (SCHEMA-DESIGN.md + SESSION_NOTES.md-update) på to forskellige sessioner gav entydig diagnose: fejlen er i Claude Code's text-generation-lag, ikke i Write-tool eller disk-skrivning. Den slags eksperimentelle diagnostik er værd at investere i frem for blind retry.

### Tilføjelser til "Arbejdsmønstre der IKKE virker"

1. **Claude Code's Write-tool på store Markdown-filer** (26. + 27. maj) — reproducerede systematisk duplikat-fejl af 2 sammenhængende linjer i sidste tredjedel af dokumentet. Workaround: manuel copy-paste fra Claude.ai-hovedchat til VS Code.
2. **PowerShell [System.IO.File]::WriteAllText som workaround for Claude Code-duplikat-fejl** (27. maj) — virker IKKE, fordi fejlen er upstream i text-generation. Workaround skulle have ramt etablerings-laget men gjorde det ikke.
3. **Tro at preview-rendering = raw indhold** (26. maj) — chat-UI'er fortolker Markdown (## bliver headers, ** bliver bold, ``` bliver kodeblokke) hvilket gør formattering "usynlig" i preview. Verifikation kræver raw-text-output, ikke renderet preview.
4. **Antage at fejl er engangs-glitch når den reproducerer sig** (26. maj) — efter 2 identiske fejl er mønstret etableret; 3. retry bør betragtes som spildt energi. Disciplin: stop og skift strategi.

### Tilføjelse til "Editor-disciplin"

- Markdown-redigering KUN i VS Code (ren UTF-8)
- Cursor må IKKE bruges (auto-escape)
- Notesblok må IKKE bruges (ANSI/CP1252 på ældre Windows)
- Verificer encoding-indikator nederst i VS Code-statusbar før gem (UTF-8 uden BOM)
- **For større Markdown-filer (>200 linjer):** Brug manuel copy-paste fra Claude.ai-hovedchat. Claude Code's tool-baserede skrivning er ikke pålidelig for denne fil-størrelse (verificeret 26. + 27. maj).

---

## Kommunikationspræferencer

Uændret. Dansk, brutal ærlighed, eksplicit STOP-punkter, push og commit-beslutninger hos mennesket.