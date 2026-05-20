# SESSION_NOTES.md

Denne fil bevares som kontinuitet mellem AI-assisterede arbejdssessioner. Læs den ved start af hver ny session sammen med CLAUDE.md.

**Sidst opdateret:** 19. maj 2026
**Sidst aktive session:** 19. maj 2026 (Schema-drift identificeret + P1-client audit + branch-rename)

---

## Hvor vi står lige nu

### ✅ Branch-rename gennemført

`cursor-automation` er fast-forward merget til `main` og slettet. GitHub default er `main` (uændret). Alle 28 commits er bevaret med samme SHA-hashes. Cosmetic note: Cursor's initial commit `c157919` ("Opdateret projekt med nye features og struktur") ligger stadig som ancestor i historikken — ikke værd at omskrive.

### ✅ types.ts er bragt i sync med faktisk remote schema

`src/lib/supabase/types.ts` afspejler nu de 9 BASE TABLES der faktisk findes i remote public schema:
- `audit_logs`, `bids`, `organisation_members`, `organisation_types`, `organisations`, `profiles`, `tender_documents`, `tender_questions`, `tenders`

Forberedelses-infrastruktur etableret:
- `npm run db:types` script i `package.json` (Supabase CLI-linket)
- Supabase-projekt linket via `npx supabase link --project-ref pupvcezanbwyhhewskcv`
- `supabase/.temp/` er gitignored
- Alle 7 lokale migrations bekræftet synkrone med remote via `npx supabase migration list`

**ADVARSEL:** `npm run db:types` har endnu ikke håndteret PowerShell's UTF-16 BOM-encoding-fælde. Næste regen skal ske via `tsx scripts/gen-types.ts`-shim eller manuelt med `Out-File -Encoding utf8NoBOM`. Scriptet i package.json er forberedelse, ikke produktionsklar.

### ✅ P1-client audit gennemført

Inspect-only audit af `udbud-dk-client.ts` + `env.ts` + `.env.example`. Resultater dokumenteret i `docs/P1-CLIENT-AUDIT-2026-05-19.md`.

**Sammenfatning:** Ingen 🔴-kritiske bugs. 8 ⚠️-bemærkninger der hver isoleret er små, tilsammen tegner billede af "fungerende prototype 80% til produktion". Pre-PROD-ready estimat: ~2-3 timer fokuseret arbejde på P0+P1-items.

### 🔴 Schema-drift identificeret 19. maj — kritisk fund

Stub'en `types.ts` (Cursor-arv) indeholdt **fiktive tabeller** og **fiktive kolonner** der aldrig blev oprettet i remote schema:

**Fantom-tabeller (bekræftet via pg_class — eksisterer ingen steder):**
- `leads` — fjernet sammen med `src/app/api/leads/route.ts` (ingen anden brug)
- `publication_jobs` — refereret aktivt i `src/lib/publication/service.ts` (4 linjer)
- `tender_participants` — refereret aktivt i `src/app/supplier/page.tsx` (2 linjer) + `src/app/buyer/page.tsx` (1 linje)

**Fantom-kolonner på `tenders` (bekræftet via gen types output):**
- `evaluation_documents` — refereret i `src/app/api/tenders/[id]/evaluation-documents/route.ts` + `src/app/tenders/[id]/bids/page.tsx`
- `prequalification_deadline` — refereret i `buyer/page.tsx`
- `awarded_bid_id` — refereret i `tenders/[id]/bids/page.tsx`. **Modstrider Rute C-beslutning** (18. maj): "UI udleder state fra bids" — kolonnen bør IKKE eksistere

**Andre drift-symptomer:**
- `supplier_status`-kolonne refereret som join-resultat i supplier/buyer-flow
- `profiles.active_role` enum-stramning afslørede string-assignment-issues i `src/app/(app)/layout.tsx`

**Hvad det betyder:** Følgende kode-stier kompilerede men har **aldrig fungeret i runtime** mod faktisk database:
- `src/app/supplier/page.tsx` — supplier-dashboard
- `src/app/buyer/page.tsx` — buyer-dashboard  
- `src/lib/publication/service.ts` (delvist — publication_jobs-referencer)
- `src/app/api/tenders/[id]/evaluation-documents/route.ts`
- `src/app/tenders/[id]/bids/page.tsx`

**Beslutning truffet 19. maj:** Fortolkning 2 — vi designer schema og kode rigtigt over flere sessioner. Ingen quick-fixes. Vi accepterer at pilot 8. juni potentielt skubbes.

### ✅ Tidligere arbejde stadig gyldigt

- Database-fundament: 7 migrations synkrone med remote (verificeret 19. maj)
- P1: Udbud.dk env-bevidst client (auditeret 19. maj, fungerer som intended for nuværende use case)
- ERST PREPROD-credentials virker, PROD-adgang tildelt
- Funktionel test fra commit b993e72 stadig grøn (smoketest 18. maj bekræftet med eforms-sdk-dk-1.13.0-1.3.0)

---

## Det vigtigste at vide før næste session

### 🔴 Schema-design er det største ikke-løste problem

Vi ved hvad der mangler, men ikke hvordan det skal designes. Kommende sessioner skal designe:

1. **`tender_participants`** — Hvad er user story? Erstatning via `organisation_members` + status-kolonne på `bids`? Eller separat kobling?
2. **`publication_jobs`** — Async queue med worker-process, eller simpel audit-log af publikationsforsøg? Hvor er worker'en?
3. **`evaluation_documents` på `tenders`** — Array-kolonne eller separat `tender_evaluation_documents`-tabel?
4. **`awarded_bid_id` på `tenders`** — Skal modstride Rute C-beslutning, eller skal koden i `tenders/[id]/bids/page.tsx` refaktoreres til at udlede vinder fra `bids.status='winner'`?
5. **`prequalification_deadline`** — Separat fase-tabel eller kolonne på tenders?
6. **`supplier_status`** — Hvor skal det leve? På bids? På en relation-tabel?
7. **`leads`** — Slettet i denne session. Hvis lead-capture skal eksistere, skal det designes fra bunden.

Hver af disse er en arkitekturbeslutning. Frank har bekræftet at ingen erindring om hvad disse skulle være — det er rent Cursor-arv.

### 🔴 P1-client har 8 ⚠️-fund — se `docs/P1-CLIENT-AUDIT-2026-05-19.md`

P0+P1-items (fix før PROD): Token-URL validering, SDK-version stramning, PROD-guard tredje lag, deprecated env warnings, pino-migration, correlation-id. Total estimat 2-3 timer.

### 🟠 db:types-script er ikke produktionsklar

PowerShell's `>` redirect skriver UTF-16 LE med BOM. Scriptet `"db:types": "supabase gen types typescript --linked --schema public > src/lib/supabase/types.ts"` vil producere korrupt fil ved næste kørsel. Workaround: brug `tsx scripts/gen-types.ts`-shim eller manuel `Out-File`. Skal fixes inden næste regen.

### 🟠 ERST-mail om søge-API afventer stadig

`system@udbud.dk` — ingen svar pr. 19. maj.

### 🟠 Compliance-status uændret

DPA'er, ZDR-aktivering, privatlivspolitik, vilkår, tilgængelighedserklæring — ikke berørt 19. maj.

### 🟠 Innobooster deadline-tjek udestår

Frank skal verificere eksakt deadline-dato på innovationsfonden.dk og afgøre om maj-runden eller september-runden er realistisk. ~30 min beslutnings-arbejde uden for sessionen.

### 🟠 P1-relateret teknisk gæld identificeret 18. maj — opdateret status 19. maj

- `.env.local` token-URL: **bekræftet korrekt** at den indeholder `?grant_type=client_credentials` (PREPROD funktionel test bestået). Issue var fraværet af validation der ville fange fejlen — adresseret som audit-fund ①
- SDK-version-format-konsistens: **bekræftet konsistent** (alle reelle referencer bruger fuldt format) — adresseret som audit-fund ②

---

## Næste session — prioriteret to-do

### Prioritet 1: Schema-design (flere sessioner)

Designsamtale per problematisk reference (se "Schema-design" ovenfor). Outputtet er et `docs/SCHEMA-DESIGN.md` der beskriver hver tabel og hver kolonne med begrundelse, før migrationer skrives. Ingen kode i denne fase.

Estimat: 2-4 sessioner over 1-2 uger.

### Prioritet 2: Migration-skriving (separate sessioner per logisk gruppe)

Med design-dokumentet skrives migrationer. Hver migration reviewes, godkendes, køres mod PREPROD, derefter remote. Estimat: 1 session per migration-gruppe.

### Prioritet 3: Regen + kaskade-cleanup

Når migrationer er pushet, regenereres types.ts. Forventet rent build hvis design er rigtigt. Estimat: 1 session.

### Prioritet 4: P1-client P0+P1-fixes

Implementér de 6 P0+P1-items fra `docs/P1-CLIENT-AUDIT-2026-05-19.md`. Estimat: 2-3 timer i én session.

### Prioritet 5: Pre-pilot tasks

- db:types-script fix (UTF-8 BOM workaround) — 30 min
- UI-skelet med shadcn/ui (oprindeligt planlagt til 20. maj, udskudt) — ikke estimeret
- Auth-UI verification mod Server Actions-refaktor — ikke estimeret

### Prioritet 6: Compliance + Innobooster (eksternt arbejde)

Menneske-arbejde. Status-check af DPA'er, ZDR, juridisk indhold. Innobooster deadline-vurdering.

---

## Arbejdsmønstre — tilføjelse fra 19. maj

Tilføjelser til "Arbejdsmønstre der virker":

1. **Verifikation før destruktive operationer** — `pg_class`-query afslørede at de tre "fantom-tabeller" reelt ikke eksisterede, modsat hvad Supabase-klientens `head: true, count: "exact"` antydede. Lærepenge: brug en query der bryder hårdt på ikke-eksisterende tabeller, ikke en der returnerer `count = null` (falsk positiv)
2. **Backup før overskrivning** — `tmp/types.stub.backup.ts` gjorde rollback trivielt da vi besluttede at udskyde regen til efter design
3. **Token-rotation efter eksponering** — personal access token roteret straks efter at have været i chat-historik. Setx for persistent miljø-variabel i begge terminaler eliminerer paste-i-chat-fristelsen

Tilføjelser til "Arbejdsmønstre der IKKE virker":

1. ~~Acceptere Claude Codes sammenfattende rapporter som tilstrækkelige til kode-audit~~ — rapporter med konklusioner (✅/⚠️/🔴) UDEN faktisk cat-output udskrevet til chatten er Claude Codes vurdering, ikke uafhængig review. Kræv altid raw kode i chatten ved P1-audit-arbejde
2. ~~Antage at `gen types --schema public` fanger alt~~ — det fanger BASE TABLES, ikke views. Hvis et fremtidigt projekt har views i public, skal vi eksplicit kræve dem

---

## Designvalg låst i Rute C (18. maj) — uændret

Disse beslutninger er stadig kode og bør IKKE genåbnes uden eksplicit grund:

- RPC = single source of truth for autorisering på evaluate-flow (intet dobbelt-check via assertTenderOwner)
- Tender-state-opdatering (evaluation_started_at, evaluation_completed_at, awarded_bid_id) skrives IKKE fra evaluate-route. UI udleder state fra bids
- Winner → bulk "mark losers as not_awarded" gøres IKKE atomisk fra evaluate-route. UI håndterer per-bid
- evaluation_notes-feltet er droppet, ikke genintroduceret. Notes-UI er lokal state uden persistens indtil bid_evaluations-tabel designes
- Status-whitelist for evaluator: under_evaluation, accepted, rejected, winner, not_awarded (5 værdier). Submitted og under_review er afvist via PATCH
- SQLSTATE-mapping: 42501 → 403, 22023 → 400
- URL-konsistens (bid hører til tender) check'es IKKE i evaluate-route. RPC autoriserer baseret på bid_id alene
- getUserRole returnerer 'owner' for profiles.role='buyer' (bagudkompatibilitet)
- getSupplierId returnerer userId direkte (supplier_id = user.id i ny model)

**Note 19. maj:** Schema-drift-fundet inkluderer `awarded_bid_id`-referencer i `tenders/[id]/bids/page.tsx`. Dette er i konflikt med "UI udleder state fra bids"-beslutningen ovenfor. Skal afklares i schema-design-fasen: enten refaktoreres UI-koden (foretrukket), eller designvalg genåbnes.

---

## Kommunikationspræferencer

Uændret. Dansk, brutal ærlighed, eksplicit STOP-punkter, push og commit-beslutninger hos mennesket.

**Tilføjelse 19. maj:** Ved kritisk kode-review kræves raw cat-output i chatten — Claude Codes "Read N lines"-bekræftelser eller `{...}`-forkortelser er IKKE tilstrækkelige.