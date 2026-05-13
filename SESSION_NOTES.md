\# SESSION\_NOTES.md



Denne fil bevares som kontinuitet mellem AI-assisterede arbejdssessioner. Læs den ved start af hver ny session sammen med CLAUDE.md.



\*\*Sidst opdateret:\*\* 13. maj 2026

\*\*Sidst aktive session:\*\* 13. maj 2026 (P1: Udbud.dk PROD/PREPROD-adskillelse med OIDC-flow)



\---



\## Hvor vi står lige nu



\### ✅ P1 færdig — Udbud.dk integration har env-bevidst client



Fem atomare commits pushed til `origin/cursor-automation`:



| Commit | Indhold |

|--------|---------|

| `ccfc88c` | env-schema: UDBUD\_DK\_ENV enum + udvidet EFORMS\_SDK\_VERSION regex |

| `3d5b202` | udbud-dk-client.ts: OIDC token-flow med cache og guards |

| `c568b72` | service.ts refaktor til at bruge client |

| `d9f37a9` | search-provider: fjernet dødkode, dokumenteret mock-baggrund |

| `bc79c28` | CLAUDE.md: fix typo, dokumentér OIDC-flow og P1 teknisk gæld |



\### ✅ Bekræftet faktuelt grundlag



\- API base URL: `https://api-demo.udbud.dk/udbud` (PREPROD) / `https://api.udbud.dk/udbud` (PROD)

\- Token endpoints: `https://erstpreprod.virk.dk/auth/token` / `https://erst.virk.dk/auth/token`

\- Auth: OIDC client\_credentials med Basic Auth, expires\_in \~600s

\- SDK-version format der virker mod ERST: `eforms-sdk-dk-1.13.0-1.3.0`

\- ERST har bekræftet: samme Basic Auth credentials til begge miljøer (adskillelse er URL-baseret)



\### ✅ Tidligere arbejde stadig gyldigt



\- Database-fundament: 4 migrations pushed (organisations, audit\_logs INSERT, bids-RLS, env-konsolidering)

\- Auth refaktoreret til Server Actions (sidste session, 29. april)

\- ERST PREPROD funktionel test bestået (commit b993e72, marts/april)

\- ERST PROD-adgang tildelt april 2026



\---



\## Det vigtigste at vide før næste session



\### 🔴 Client er IKKE smoke-testet mod PREPROD endnu



P1 har implementeret den nye client og refaktoreret service.ts, men ingen har endnu kørt et faktisk publicerings-kald gennem den nye kode-sti. TypeScript compilerer, men runtime er uverificeret.



\*\*Næste session SKAL starte med:\*\*

1\. Kør `scripts/udbud-functional-test.mjs` mod PREPROD og verificer at det stadig passerer

2\. Eller: lav et manuelt curl mod `/api/tenders/<id>/publish` med test-tender



Hvis testen fejler, har vi en bug i client- eller service-koden der skal fixes før noget andet.



\### 🔴 Payload-format mismatch er stadig en blocker for PROD



`UdbudDKPayload` returnerer fladt JSON, men ERST forventer eForms UBL XML. Den eksisterende funktionelle test (b993e72) bestod fordi den brugte XML-payload (se `scripts/output/notice-payload.xml`). Vores service.ts vil \*\*ikke\*\* virke mod ERST før payload-builder er rewritten til at producere XML.



Dette er \*\*eksisterende teknisk gæld\*\* (var også problemet før P1), men det er nu eksplicit dokumenteret i CLAUDE.md og som TODO i service.ts.



\### 🟠 ERST-mail om søge-API afventer



Send mail til `system@udbud.dk`:

\- Findes der et søge-API til fritekst/CPV/buyer-filtrering vi har overset?

\- Hvis ikke: er periodisk sync via `fraKilde/{DKUDBUD}` + lokal indeksering den anbefalede tilgang?



Email-skabelon i sidste session-output (Claude-tråd, 13. maj).



\### 🟠 Compliance-status er stadig usikker



Ikke berørt i P1:

\- DPA med Anthropic, Resend, Supabase — underskrevet?

\- ZDR aktiveret hos Anthropic?

\- `src/app/privatlivspolitik/page.tsx` og `src/app/vilkaar/page.tsx` er stubs (8 linjer hver)

\- Tilgængelighedserklæring — eksisterer den?



Skal afklares før pilotkunde åbnes.



\---



\## Næste session — prioriteret to-do



\### Prioritet 1: Smoke-test P1 mod PREPROD



Cirka 30 min menneske-arbejde. Verificer at den nye client faktisk fungerer end-to-end mod ERST PREPROD.



\### Prioritet 2: API-kode opdateret til ny RLS-model (fra sidste session)



Stadig blocker for første kunde. `src/app/api/bids/` skal refaktoreres til at bruge `get\_bid\_metadata\_for\_tender()` og `update\_bid\_status()` RPCs i stedet for direkte queries. Detaljer i tidligere SESSION\_NOTES-version (se git history hvis nødvendigt).



Estimat: 2-3 timer Claude Code.



\### Prioritet 3: Payload-builder XML-rewrite



Rewrite `src/lib/publication/payload-builder.ts` til at producere eForms UBL XML i stedet for fladt JSON. Reference: `scripts/output/notice-payload.xml` viser den korrekte struktur. ERST's CVS-validering kan bruges til at verificere output.



Estimat: 3-4 timer (kompleks XML-struktur, kræver omhu).



\### Prioritet 4: Compliance-tjek



Menneske-arbejde primært. Status-check af DPA'er, ZDR-aktivering, og udfyldning af privatlivspolitik/vilkaar.



\### Prioritet 5: Audit af pre-existing public-rolle policies



Fra sidste session. Stadig relevant. Detaljer i CLAUDE.md "Kendt teknisk gæld"-sektion.



\---



\## Forventede prompts til næste session



\### Sessionsstart-prompt (kopiér og brug)



**---**



**## Forventede prompts til næste session**



**### Sessionsstart-prompt (kopiér og brug)**



**Sidst opdateret:** 28. april 2026
**Sidst aktive sessioner:** 22. april 2026 (env-konsolidering + organisations) og 28. april 2026 (bids-RLS-konsolidering)

\---

## Hvor vi står lige nu

### ✅ Database-fundament i drift

Følgende migrations er pushed og verificeret mod remote Supabase (eu-north-1):

|Migration|Indhold|
|-|-|
|`20260417120000\_add\_active\_role\_and\_full\_name`|Pre-existing, registreret som applied via repair|
|`20260417120001\_audit\_logs\_insert\_policy`|Service role INSERT-policy på audit\_logs|
|`20260417120002\_organisations\_and\_membership`|Multi-tenant fundament|
|`20260428143000\_bids\_consolidation`|Bids-RLS efter sikkerhedsaudit|

### ✅ Database-tilstand

* 3 tabeller fra organisations-migrationen: `organisations`, `organisation\_types`, `organisation\_members`
* 6 RPC-funktioner: 3 helper (get\_my\_\*\_organisation\_ids), 1 owner-trigger (on\_organisation\_created), 2 audit-triggers, 2 bids-relaterede (get\_bid\_metadata\_for\_tender, update\_bid\_status), 1 audit-trigger (audit\_bid\_change)
* 14 RLS-policies på tværs af tabellerne
* 1 enum: `organisation\_member\_role` (owner, admin, editor, viewer)
* 3 seed-rækker i organisation\_types: housing\_association, municipality, public\_body\_other

### ✅ ERST-status

* PREPROD-adgang permanent (bekræftet via mail 28. april)
* PROD-adgang tildelt 28. april (afventer faktiske credentials)
* Funktionel test bestået (commit b993e72: DKE3 og DKE0)
* Ingen retest nødvendig ved interne datamodel-ændringer

\---

## Det vigtigste at vide før næste session

### 🔴 PROD-credentials kan være landet siden sidst

Tjek mailboksen først. Hvis credentials er ankommet:

* De skal **ikke** sættes i `.env.local` før vi har lavet PROD/PREPROD-adskillelse
* Risiko: utilsigtet publicering til den danske udbudsportal

### 🔴 API-kode er IKKE opdateret til ny RLS-model

Den eksisterende kode i `src/app/api/bids/` bruger direkte `from('bids').select(...)` og `.update(...)`. Med ny RLS:

* Buyer SELECT virker kun efter deadline (RLS blokerer før)
* Buyer UPDATE er totalt blokeret — skal kalde `update\_bid\_status()` RPC
* Pre-deadline metadata for buyer skal hentes via `get\_bid\_metadata\_for\_tender()` RPC
* Bid-submission skal sætte `created\_by = auth.uid()` (ny kolonne, RLS kræver det)

**Konsekvens:** Hvis nogen prøver det eksisterende UI nu, vil flere flows fejle. Det er OK — tabellen er tom, ingen brugere — men UI'en skal opdateres før første kunde.

### 🟠 Pre-existing teknisk gæld

Dokumenteret i CLAUDE.md (sektion "Kendt teknisk gæld — skal adresseres før produktion"):

* Pre-existing RLS-policies på `public`-rolle (audit\_logs, profiles, tender\_documents, tender\_questions, tenders) — ikke auditeret endnu
* migrations\_old/-mappen ikke CLI-tracked
* audit\_logs.actor\_type mangler dedikeret kolonne (midlertidigt i metadata.actor\_type)
* tenders.organisation\_id mangler FK-constraint
* tenders.status er fri TEXT-kolonne uden enum/CHECK-constraint

### 🟠 Suppliers-organisationsmodel mangler

`bids.supplier\_id` peger lige nu på `auth.users(id)` direkte. Det skal i fremtidig migration ændres til at pege på en organisations-baseret model. Dette er kommenteret i `20260428143000\_bids\_consolidation.sql`.

\---

## Næste session — prioriteret to-do

### Prioritet 1: PROD/PREPROD-adskillelse (hvis PROD-credentials er landet)

Konkret arbejde:

1. Verificer at `.env.local` adskiller `UDBUD\_DK\_PREPROD\_URL` fra `UDBUD\_DK\_PROD\_URL`
2. Implementer en `getUdbudDkClient(env: 'preprod' | 'prod')`-funktion der eksplicit kræver miljø-valg
3. Erstat alle direkte references til `UDBUD\_DK\_\*\_URL` med funktionskald
4. Tilføj guard der forhindrer prod-kald i development-mode
5. Opdatér src/lib/publication/service.ts til ny model
6. Test at PREPROD stadig virker

Estimat: 1-2 timer fokuseret arbejde.

### Prioritet 2: Compliance-status-tjek

Brugeren tjekker selv:

* DPA med Anthropic — er den underskrevet? Er ZDR aktiveret?
* DPA med Resend — er den underskrevet?
* DPA med Supabase — er den underskrevet?
* privatlivspolitik/-mappen — er filen udfyldt eller tom?
* vilkaar/-mappen — er filen udfyldt eller tom?
* Tilgængelighedserklæring — eksisterer den?

Status sendes til AI for vurdering af hvad der mangler.

### Prioritet 3: API-kode opdateret til ny RLS-model

Konkret arbejde:

1. `src/app/api/bids/route.ts` — POST sætter `created\_by = user.id`, fjern fallback-bug
2. Buyer-flow: erstat direkte bids-queries med `get\_bid\_metadata\_for\_tender()` RPC
3. Buyer-evaluering: erstat direkte UPDATE med `update\_bid\_status()` RPC
4. Kør `npx tsc --noEmit` og verificer ingen typefejl
5. Manuel test af bid-submission og listing

Estimat: 2-3 timer fokuseret arbejde.

### Prioritet 4: Suppliers-organisationsmodel

Større arkitekturarbejde. Kræver designsamtale før kode. Indebærer:

* Beslutte om suppliers er `organisations` med ny `type\_code`, eller separat tabel
* Ny migration der tilføjer `bids.supplier\_organisation\_id`
* Drop `bids.supplier\_id` FK til auth.users, erstat med organisationsreference
* Opdater RLS-policies tilsvarende

Estimat: 3-5 timer inkl. design og review.

### Prioritet 5: Audit af pre-existing policies på public-rolle

For hver tabel med policies på `public`-rolle:

1. Hent USING-klausuler via Supabase SQL Editor
2. Vurder om de faktisk lækker
3. Lav rettelses-migration hvis nødvendigt

Tabeller: audit\_logs, profiles, tender\_documents, tender\_questions, tenders.

Estimat: 2-4 timer.

\---

## Forventede prompts til Claude Code ved næste session

### Sessionsstart-prompt (kopiér og brug)

```
Det er ny session. Læs CLAUDE.md og SESSION\_NOTES.md først, og bekræft kort at du har læst begge.

Derefter:
1. Kør `npm run check-db` og bekræft at fundamentet stadig virker
2. Kør `git status` og rapportér tilstanden
3. Bekræft at vi er på branch `cursor-automation` (eller anden hvis brugeren angiver)
4. Spørg brugeren hvilken prioritet fra to-do-listen vi tager først

STOP og afvent valg af prioritet før du går i gang med konkret arbejde.
```

\---

## Arbejdsmønstre der virker (lærdom fra session 22.-28. april)

1. **Eksplicit STOP mellem hver kritisk fase** — verificer før eksekvering
2. **Vis hele filer ved review, ikke "Read 1 file"** — diff-snippets er ikke nok til security-arbejde
3. **Manuel verifikation i Supabase Studio efter migration** — PostgREST har begrænsninger på system-schemas
4. **Atomare commits per logisk enhed** — gør revert nemmere
5. **Designsamtale i denne tråd, kode-skrivning i Claude Code** — separation of concerns

## Arbejdsmønstre der IKKE virker

1. ~~"Køre på" uden review når noget virker tilsyneladende~~ — leder til opdagelser som "read bids" USING (true) og to-konventions-rod
2. ~~Lade AI eksekvere SQL fra review-snippets~~ — de er illustrationer, ikke køreklar SQL
3. ~~Bruge inline heredoc med variabel-substitution i bash~~ — fanges af security-prompts og er svære at debugge
4. ~~Acceptere "Read 1 file (ctrl+o to expand)"-output ved security-review~~ — vi skal se SQL'en

\---

## Kontekst-noter

* **Pilotkunde-mål:** 1-2 måneder, ambitionen er en mindre boligorganisation via BL eller KAB, eller DSB (long shot)
* **Compliance før brugere:** brugeren accepterer ikke at åbne for kunder før compliance er på plads
* **AI-evaluering:** ikke kritisk vej, tilvalg, kommer senere
* **Branch-strategi:** stadig på `cursor-automation` — overvej at skifte til `main` med PR-flow når MVP er klar

## Kommunikationspræferencer

* Dansk hvor muligt
* Brutal ærlighed, ingen ekkokammer
* Markér eksplicit hvad der kan delegeres til Claude Code vs. menneske-kun
* Strategiske beslutninger ligger hos mennesket
* Push og commit-beslutninger ligger hos mennesket





