# SESSION_NOTES.md

Denne fil bevares som kontinuitet mellem AI-assisterede arbejdssessioner. Læs den ved start af hver ny session sammen med CLAUDE.md.

**Sidst opdateret:** 22. maj 2026
**Sidst aktive session:** 22. maj 2026 (kort session — ERST DKUDBUD-arkitektur bekræftet + Reference #9 scoped)

---

## Hvor vi står lige nu

### ✅ 20. maj — Schema-design fase 1 gennemført

6 design-beslutninger truffet for de problematiske stub-referencer identificeret 19. maj. Ingen migrationer skrevet, ingen kode rørt — kun designsamtale med eksplicitte beslutninger. Detaljeret i sektionen "Dagens designbeslutninger" nedenfor.

**Plus tilføjet til arbejdsliste:** Reference #8 (fasekonkluderende meddelelser/tildelingsbreve) opstod under #3-diskussionen og designes næste session efter #5-fundament er på plads.

### ✅ 20. maj — scripts/gen-types.mjs (commit 482814b)

`db:types`-scriptet virker nu uden BOM-problem:
- `scripts/gen-types.mjs` (83 linjer) spawner Supabase CLI og skriver via `fs.writeFileSync` med eksplicit UTF-8-encoding
- `package.json`: `npm run db:types` skriver direkte til `src/lib/supabase/types.ts`; `npm run db:types:dry` skriver til `tmp/types.new.ts` for review-først-flow
- Verificeret 20. maj: dry-run producerede 17484 bytes / 592 linjer, første 3 bytes 101 120 112 (= "exp"), ingen BOM
- Sanity-check fangede `npx`-installations-prompt på første kørsel (regex afviste "Need to install the following") — defensiv kode bestod første test
- Pushed til origin/main

### ✅ 22. maj — ERST DKUDBUD-arkitektur bekræftet

ERST-mail modtaget 22. maj 2026 fra `system@udbud.dk` på rykker fra 20. maj:

> 1. Findes der et søge-API vi har overset?
> Det korte svar er, nej, der er ikke noget søge-API i har overset.
> 2. Hvis ikke — er den anbefalede arkitektur at vi periodisk syncer fraKilde/DKUDBUD og indekserer lokalt til søgning?
> ja, det er lige præcist det vi anbefaler.

**Direkte implikationer:**
- `src/lib/search/providers/udbuddk.ts` mock-data skal erstattes med lokal indeks-query
- Lokal sync-tabel(ler) skal designes (Reference #9, scoped men ikke designet)
- Forward-compatible: webhook-baseret push fra ERST kan tilføjes senere hvis tilbudt

**Sessions-omfang 22. maj:** Reference #9 tilføjet til arbejdsliste, 6 underspørgsmål + 2 afventer-spørgsmål formuleret. Ingen designvalg truffet — bookes til næste session 25. maj.

### 🔴 src/lib/supabase/types.ts er STADIG den håndskrevne stub

Diff mellem den genererede `tmp/types.new.ts` og nuværende `src/lib/supabase/types.ts` viste at sidstnævnte stadig er stub-formatet fra Cursor-perioden, inkl. fiktive tabeller (`tender_participants`, `publication_jobs`) og fiktive kolonner (`awarded_bid_id`, `evaluation_documents`, `prequalification_deadline`, `evaluation_started_at`, `evaluation_completed_at`).

**Korrektion af tidligere SESSION_NOTES-formulering:** "types.ts nu i sync med faktisk remote (9 BASE TABLES)" var ikke korrekt. 19. maj-arbejdet endte med targeted patch (commit 772a238 i Rute C), ikke fuld regenerering. Stub'en lever stadig — det er præcis det Prioritet 1 til næste session adresserer.

### ✅ Smoke-test bestået mod ERST PREPROD (18. maj 2026)

Funktionel test kørt med `--sdk-version auto`:
- DKE3 (Krav 1.1): Validate 200 + Publish 200 — noticeId `03b9f5c8-bc63-4b30-8709-e71330053395`
- DKE0 (Krav 1.2): Validate 200 + Publish 200 — noticeId `ff9a37d5-f711-4900-a16e-184d20b48c33`
- Token-fetch: OK, expires_in 600s
- Korrekt SDK-version format pr. 18. maj: `eforms-sdk-dk-1.13.0-1.3.0` (MED prefiks)

### ✅ Tidligere arbejde stadig gyldigt

- Database-fundament: 4 migrations pushed
- P1: Udbud.dk env-bevidst client med OIDC token-flow (5 commits, 13. maj)
- ERST PREPROD-credentials virker, PROD-adgang tildelt
- P1-client audit gennemført 19. maj (8 ⚠️-fund, ingen 🔴-kritiske bugs, dokumenteret i `docs/P1-CLIENT-AUDIT-2026-05-19.md`)
- Rute C færdig (commits 49a90e1, 772a238, 25e15d6 — 18. maj)
- Branch `cursor-automation` slettet, main er nu primær (28 commits bevaret via fast-forward, 19. maj)

---

## Dagens designbeslutninger (20. maj)

Disse 6 beslutninger er låst medmindre ny væsentlig evidens dukker op. Formuleres formelt i `docs/SCHEMA-DESIGN.md` næste session.

### Beslutning #1 (`leads`): A — Ikke platform-concern

Lead-capture eksisterer ikke som platformkoncept. Henvendelser fra potentielle kunder håndteres via email indtil videre. Ingen tabel, ingen route, ingen tilbagevenden uden eksplicit ny brugerhistorie.

### Beslutning #2 (`publication_jobs`/`publication_log`): A — Audit-log + status-felter

Bekræftet via Supabase Dashboard SQL Editor 20. maj: hverken `publication_jobs` eller `publication_log` eksisterer som BASE TABLE. Begge var stub-tænkning.

**Ny tabel:** `publication_events` (immutable append-only audit-log): `tender_id`, `event_type`, `notice_id`, `sdk_version`, `request_payload_hash`, `response_status`, `response_body`, `error_message`, `environment` (preprod/prod), `created_at`, `created_by`.

**Status på `tenders`:** Nye kolonner `publication_status`, `notice_id`, `notice_version`, `published_at`, `last_publication_attempt_at`.

Ingen queue-tabel. Retry sker synkront eller via simpel cron. Forward-compatible — kan udvides til job-queue model senere uden datamigration.

### Beslutning #3 (`evaluation_documents`): B — Separat tabel, frivilligt felt

**Ny tabel:** `evaluation_documents` — kun ordregivers interne arbejdsdokumenter (scoreark, mødereferater, beslutningsnotater, evalueringsrapporter, indstillingsnotater). Tilbudsgivere kan aldrig se denne tabel.

**Udvider eksisterende `tender_documents`:** Med `document_type`-enum (`procurement_material`, `evaluation_method`, `contract_draft`, `appendix`, `clarification`).

**Vigtig scope-låsning:** evaluation_documents er **frivilligt** — ingen NOT NULL-constraints, intet workflow blokerer for tildeling hvis tabellen er tom. Praktikere bruger ofte Excel lokalt; platformen tvinger ikke skift.

Udgående meddelelser (tildelingsbreve etc.) hører IKKE i `evaluation_documents` — separat reference #8.

### Beslutning #4 (`prequalification_deadline`): B — Separat `tender_phases`-tabel

**Ny tabel:** `tender_phases` med `tender_id`, `phase_type` (enum), `deadline` (nullable), `sequence_number`, `is_active`, `completed_at`, `notes`.

**Procedurer i v1:**
- Offentligt udbud: 1 tilbudsfase
- Begrænset udbud: 1 pq-fase + 1 tilbudsfase
- Udbud med forhandling: 1 pq-fase + 1+x tilbudsfaser (justérbart undervejs)
- Annonceringsudbud under tærsklen: 1 fase

**Senere udvidelser:** Konkurrencepræget dialog (samme struktur som forhandling), kvalifikationsordning (1 pq-fase **uden deadline** — derfor nullable).

**Implikationer:**
- Faser kan tilføjes EFTER publication (forhandling kan udvide med tilbudsrunder) — ingen "frys faser ved publicering"-constraint. Tilføjelser skal være journaliseringspligtige.
- Standstill modelleres som fase (`phase_type = 'standstill'`), ikke separat mekanisme.
- Fristberegning-logik (à la fristberegneren.dk) hører naturligt på fase-objekter.

### Beslutning #5 (`tender_participants` + `supplier_status`): Udfald 2 — Fuld virksomhedsmodel ⚠️ RUTE C-GENÅBNING

**Nye tabeller:**
- `supplier_organisations` (CVR-baseret)
- `supplier_organisation_users` (mange-til-mange — en user kan tilhøre flere virksomheder)
- `tender_participants` — deltagelse i udbud knyttet til virksomhed, ikke person

**Refaktor af bids:**
- `bids.supplier_id` ændres til `supplier_organisation_id`
- `getSupplierId()` returnerer org-id, ikke user.id
- `update_bid_status`-RPC opdateres så autorisation tjekker `supplier_organisation_users`

**User-handlinger logges i audit_log:** `tender_participants` har de strukturelle felter (status, timestamps) uden user-felt. Hver handling/state-ændring logges i `audit_log` med både `supplier_organisation_id` og handlende `user_id`. UI viser primært virksomhed; user-detalje via audit-log-drilldown.

**Rute C-konflikt:** 18. maj-beslutning *"supplier_id = user.id i ny model"* genåbnes. Begrundelse: pq-ansøgninger kræver virksomhedsmodel; ESPD er CVR-baseret; konkurrentparitet kræver flere users per virksomhed; almene boligselskaber forventer virksomheds-visning. Rute C-RPC'er omskrives ikke — kun autorisations-tjek i `update_bid_status` opdateres.

**MitID Erhverv-verifikation udskudt** til efter v1 — brugeren indtaster CVR uden verifikation indtil videre.

### Beslutning #6 (`awarded_bid_id`): Udfald 2 — Eksplicit på `tender_lots` + `award_bid`-RPC ⚠️ RUTE C-GENÅBNING

**Ny kolonne:** `tender_lots.awarded_bid_id` (nullable, FK til `bids.id`).

**Ny RPC:** `award_bid(tender_lot_id, bid_id)` — eneste vej til vinder-markering. Opdaterer atomisk:
- `tender_lots.awarded_bid_id`
- `bids.status = 'winner'` for vinder
- `bids.status = 'not_awarded'` for øvrige bids på lot'en

**Implikation for `update_bid_status`:** Direkte 'winner'-overgang afvises. Evaluator-flow gennem RPC, ikke direkte tabel-opdateringer.

**Implikation for udbud uden delaftaler:** Implementeres som "udbud med præcis én lot". Industri-standard pattern.

**Rute C-konflikt:** 18. maj-beslutninger *"Tender-state-opdatering ... skrives IKKE fra evaluate-route. UI udleder state fra bids"* og *"Winner → bulk mark losers as not_awarded gøres IKKE atomisk fra evaluate-route. UI håndterer per-bid"* genåbnes.

**Begrundelse for genåbning:** Tre forhold ændrer arkitekturkonteksten siden 18. maj:
1. `tender_phases` (#4) gør tildeling til distinkt fase, ikke status-ændring
2. Tildelingsbreve (#8) kræver atomisk vinder-identifikation for korrekt brev-generering
3. Delaftaler gør "vinder per udbud" til misvisende koncept; vinder per lot er rigtig granularitet

**Hvad bevares fra Rute C:** `bids.status` forbliver sandhedskilde for individuelle bid-states. `update_bid_status`-RPC bevarer sin rolle for evaluerings-statuser (`under_evaluation`, `accepted`, `rejected`). Klage-håndtering: `cancel_award`-RPC kan revertere uden at slette bids — audit-trail bevares.

### Reference #8 (tilføjet til arbejdsliste): Fasekonkluderende meddelelser

Designes næste session (efter #5-fundament er på plads).

**Dækker:** Tildelingsbrev (§ 171), prækvalifikationsbeslutning (§ 170), annullering, standstill-afslutning.

**Særkender:** Per-modtager personaliseret, samtidig udsendelse (ligebehandlingsprincippet), juridisk virkende (udløser standstill, klagefrist), modtagelses-status bevisbar.

**Standstill-feature:** Skal eksistere på platformen. Manuel ved pilot hvis kompleks. Fristberegning kan senere kopiere `fristberegneren.dk`-logik (dansk udbudsret-frist-matematik er ikke triviel — fortjener separat design-spor).

---

## Reference #9-scoping (22. maj) — afventer designsamtale 25. maj

Sektion dokumenterer scope og underspørgsmål; INGEN beslutninger truffet 22. maj.

### Underspørgsmål til designsamtale 25. maj

1. **Scope-afgrænsning:** Hvad indeholder lokal sync — kun DKUDBUD, eller også TED og eget-publicerede?
   - Foreløbig analyse: DKUDBUD + eget-publicerede; TED separat (ikke eSender endnu)
   - Begrundelse: tilbudsgiver-søgning skal vise ALLE relevante tenders

2. **Sync-strategi:** Pull-baseret cron, push via webhook, eller hybrid?
   - Foreløbig analyse: pull-baseret cron via Vercel Cron eller Supabase scheduled functions
   - Webhook eksisterer formentlig ikke (verificeres via opfølgende ERST-mail)

3. **Sync-frekvens og delta-håndtering:** Full refresh vs. inkrementel; hvor ofte; hvordan håndteres rettelser/annulleringer?
   - Foreløbig analyse: inkrementel pull hver 15-30 min via `fraKilde/DKUDBUD?from={lastSyncTimestamp}` hvis from-parameter understøttes
   - Initial full sync første kørsel
   - Verifikation: tjek `openapi-udbud.yml` for from-parameter-støtte

4. **Retention:** Hvor længe gemmer vi sync'ede notices lokalt?
   - Foreløbig analyse: ubegrænset for "live" tenders + 5 år for lukkede (matcher arkivlov-rytme)
   - Tunes efter datavolumen-erfaring

5. **Indekserings-strategi:** Strukturerede kolonner alene, PostgreSQL tsvector, eller ekstern søgemaskine?
   - Foreløbig analyse: PostgreSQL tsvector + GIN-indeks i v1
   - Begrundelse: Supabase native, ingen ekstra infra
   - Forward-compatible: skifte til Meilisearch hvis latency/volumen kræver det

6. **Relation til eget-publicerede tenders:** Forenet eller separat indeks?
   - Foreløbig analyse: én forenet tabel `notices` med `source`-enum (`dkudbud_sync` | `own_published`)
   - Eget-publicerede tenders skriver ind via trigger eller eksplicit funktion ved publicering
   - Implikation: `publication_events` (Reference #2) trigger'er muligvis indeks-write

### Afventer ERST-opfølgning (kan ikke besvares 25. maj uden mere info)

- **CPV-traversering:** Returnerer ERST flade eller hierarkiske CPV-felter? Søger vi på CPV-kode alene eller hele underhierarkiet?
- **Notice-status livscyklus:** Hvordan håndterer ERST "ændret", "annulleret", "korrigeret" notices? Diff-format eller ny version?

Rykker-mail til ERST udsendes næste session efter designsamtalen, baseret på hvad #9-beslutningerne afhænger af.

### Estimat

Fuld designsamtale 45-60 min næste session (25. maj), før SCHEMA-DESIGN.md hovedopgaven påbegyndes. Hvis #9 trækker over 60 min, splittes — kerne-spørgsmål #1, #2, #5, #6 prioriteres da disse blokerer SCHEMA-DESIGN.md-strukturen.

---

## Det vigtigste at vide før næste session

### 🔴 Hovedopgave næste session: Skriv `docs/SCHEMA-DESIGN.md`

Format: ét langt dokument med struktur per reference (status, konflikt-risiko, kode-referencer, brugerhistorie, designvalg, beslutning, opfølgning). Plus cross-cutting sektion med migrations-rækkefølge.

Output skal være låst dokument der kan bruges som grundlag for migrations-skrivning ugen efter.

### 🔴 Faktisk types.ts-regenerering er STADIG udestående

`db:types`-scriptet virker — men selve regenereringen er ikke kørt mod `src/lib/supabase/types.ts`. Den nuværende stub indeholder stadig fiktive tabeller. Kaskade-håndtering kræver dedikeret scope og bør sandsynligvis vente til EFTER migrationer er kørt for de nye tabeller fra schema-design.

**Forventet rækkefølge:**
1. `docs/SCHEMA-DESIGN.md` færdig (næste session)
2. Migrationer skrives og testes
3. Migrationer pushes til remote
4. `npm run db:types` regenererer mod nyt schema
5. Kaskade-fix i src/

### 🔴 P1's nye client er stadig ikke direkte runtime-testet

Smoke-test 18. maj brugte scriptets egen parallelle auth-implementation, ikke `udbud-dk-client.ts`. Audit-punkter dokumenteret i `docs/P1-CLIENT-AUDIT-2026-05-19.md`. Pre-PROD estimat 2-3 timer. Ikke kritisk før vi har schema klart.

### 🔴 Payload-format mismatch er stadig blocker for service.ts → PROD

`UdbudDKPayload` returnerer fladt JSON, ERST forventer eForms UBL XML. service.ts har TODO. Payload-builder-rewrite (estimat 3-4 timer) udestår. Bør tackles før første reelle PROD-publicering.

### ✅ ERST-mail om søge-API besvaret (22. maj)

ERST bekræftede 22. maj 2026: intet søge-API, anbefalet arkitektur er periodisk sync via `fraKilde/DKUDBUD` med lokal indeksering. Se Reference #9-scoping sektion ovenfor for opfølgning.

Opfølgende ERST-mail planlagt efter #9-designsamtale 25. maj — vedrører CPV-traversering og notice-status livscyklus.

### 🟠 Pilot 8. juni-realisme — tidsplan strammere efter 22. maj

22. maj brugt på ERST-svar og Reference #9-scoping (ikke SCHEMA-DESIGN.md). Revideret arbejdsplan:
- 25. maj: Reference #9 designsamtale (45-60 min) + SCHEMA-DESIGN.md med #1-#8 (2-3 timer)
- 26-31. maj: Migrationer + tests + #9 sync-implementering hvis tid
- 1-7. juni: Faktisk types.ts-regenerering + kaskade-fix + UI-arbejde
- 8. juni: Pilot-møde

Hvis 25. maj-blokken glider over én session, skubbes hele kæden. #9-implementering er sekundær for pilot — kan udsættes hvis det presser SCHEMA-DESIGN.md eller migrationer.

### 🟠 Innobooster periode 3: åbner 27. maj, lukker 6. august 2026

Verificeret 20. maj. Optimal timing — ikke akut press lige nu, men deadline er konkret. Bør dedikere session til ansøgningsarbejde i juni når pilot er overstået. Kapital-injektion-status til ApS (100.000 DKK-tærskel) skal verificeres som del af ansøgningsforberedelse.

### 🟠 Compliance-status stadig usikker

DPA'er, ZDR-aktivering, privatlivspolitik, vilkår, tilgængelighedserklæring — ikke berørt 20. maj. Påkrævet før onboarding af reelle brugere.

---

## Næste session — prioriteret to-do

### Prioritet 1: Reference #9-designsamtale (DKUDBUD lokal sync)

Bygger på ERST-bekræftelse fra 22. maj. 6 underspørgsmål + 2 afventer-punkter formuleret i sektion "Reference #9-scoping (22. maj)". Estimat: 45-60 min. Skal gennemføres FØR SCHEMA-DESIGN.md skrives — #9-tabel-design påvirker cross-cutting sektion.

### Prioritet 2: Skriv `docs/SCHEMA-DESIGN.md`

Med 20. maj-beslutninger (#1-#6) + #8-design + #9-beslutninger fra P1. Reference #8 (fasekonkluderende meddelelser) indlejres som del af dokumentet — separat designsamtale 45-60 min efter #5-fundament er på plads. Samlet estimat: 2-3 timer.

### Prioritet 3: P1-client audit-opfølgning

Inspect-only verifikation af `udbud-dk-client.ts` (token-URL grant_type, SDK-version-format, token-cache global mutable state). Detaljeret i `docs/P1-CLIENT-AUDIT-2026-05-19.md`. Estimat: 15-30 min.

### Prioritet 4: UI-fixes (parkerede fra Rute C)

Nu med ny kontekst fra #5/#6-beslutninger:
- C3: `tenders/[id]/bids/page.tsx` — joiner mod ikke-eksisterende suppliers-tabel; refaktor til `supplier_organisations`
- C4: `buyer/page.tsx` — bid-counter altid 0 pre-deadline (ny RPC `get_bid_counts_for_tenders` eller lazy-load per tender)
- BidEvaluationRow: notes-UI stadig synlig men sender ikke til backend (parkeret indtil bid_evaluations-tabel designes)

Estimat: 2-3 timer inkl. ny RPC-design.

### Prioritet 5: Payload-builder XML-rewrite

`UdbudDKPayload` → eForms UBL XML. Estimat: 3-4 timer.

### Prioritet 6: Compliance-tjek

Menneske-arbejde. Status-check af DPA'er, ZDR, juridisk indhold. Bør tackles før pilot.

---

## Designvalg låst i Rute C (18. maj) — opdateret med 20. maj-genåbninger

Disse beslutninger er kode og bør IKKE genåbnes uden eksplicit grund:

- RPC = single source of truth for autorisering på evaluate-flow (intet dobbelt-check via assertTenderOwner)
- evaluation_notes-feltet er droppet, ikke genintroduceret. Notes-UI er lokal state uden persistens indtil bid_evaluations-tabel designes
- Status-whitelist for evaluator: under_evaluation, accepted, rejected, winner, not_awarded (5 værdier). Submitted og under_review er afvist via PATCH
- SQLSTATE-mapping: 42501 → 403, 22023 → 400
- URL-konsistens (bid hører til tender) check'es IKKE i evaluate-route. RPC autoriserer baseret på bid_id alene
- getUserRole returnerer 'owner' for profiles.role='buyer' (bagudkompatibilitet)

**⚠️ Genåbnet 20. maj — IKKE længere gyldigt fra 18. maj:**

- ~~Tender-state-opdatering (evaluation_started_at, evaluation_completed_at, awarded_bid_id) skrives IKKE fra evaluate-route. UI udleder state fra bids~~ — **ERSTATTET af #6**: `award_bid`-RPC opdaterer atomisk; `awarded_bid_id` er førsteklasses på `tender_lots`
- ~~Winner → bulk "mark losers as not_awarded" gøres IKKE atomisk fra evaluate-route. UI håndterer per-bid~~ — **ERSTATTET af #6**: `award_bid`-RPC håndterer atomisk
- ~~getSupplierId returnerer userId direkte (supplier_id = user.id i ny model)~~ — **ERSTATTET af #5**: returnerer supplier_organisation_id

---

## Arbejdsmønstre — opdateret 20. maj

### Tilføjelser til "Arbejdsmønstre der virker"

1. **Auto-mode på funktionel test ved version-mismatch** (18. maj) — `--sdk-version auto` prober kandidater og finder accepteret format
2. **Targeted patch frem for full regen** (18. maj) når full regen kræver auth-setup vi ikke har tid til — pragmatisk midtervej der løser konkret typing-problem uden kaskade-risiko
3. **Sikkerhedsventil i estimat-overskridelse** (18. maj) — eksplicit valg mellem "fortsæt", "pragmatisk hybrid" eller "accept teknisk gæld" når budget overskrides
4. **Designsamtale-rytme med Rute C-protokol** (20. maj) — én reference ad gangen, eksplicit STOP mellem hver, ny evidens kræves for at genåbne tidligere beslutninger
5. **Defensiv kode i build-toolchain** (20. maj) — sanity-check på første 30 tegn af CLI-output fangede `npx`-installations-prompt. Forsvar i lag virker selv på trivielle udseende scripts
6. **Get-Content i PowerShell for kritisk file-review** (20. maj) — omgår Claude Code's tool-interface-begrænsning (se nedenfor)

### Tilføjelser til "Arbejdsmønstre der IKKE virker"

1. ~~Acceptere Claude Code's `{ ... }`-forkortelser ved kodeinspect~~ (18. maj) — kræver eksplicit `cat`-output, ikke `view`
2. ~~Antage at smoke-test-script reelt verificerer ny kode-sti uden at læse scriptet først~~ (18. maj) — scriptet havde parallel auth-implementation
3. **Antage at Claude Code's `cat`-eksekvering faktisk er bash-cat** (20. maj) — Claude Code's interface rebinder `cat scripts/X` til `Read`-tool og rapporterer "rå bash stdout ovenfor" som FALSK påstand. Workaround: brug `Get-Content` i PowerShell uden for Claude Code til kritisk file-verifikation. Også selv om man eksplicit prompter "Brug Bash-toolet, ikke Read-toolet"

### Tilføjelse til "Editor-disciplin"

- Markdown-redigering KUN i VS Code (ren UTF-8)
- Cursor må IKKE bruges (auto-escape)
- Notesblok må IKKE bruges (ANSI/CP1252 på ældre Windows)
- Verificer encoding-indikator nederst i VS Code-statusbar før gem (UTF-8 uden BOM)

---

## Kommunikationspræferencer

Uændret. Dansk, brutal ærlighed, eksplicit STOP-punkter, push og commit-beslutninger hos mennesket.