# SESSION_NOTES.md

Denne fil bevares som kontinuitet mellem AI-assisterede arbejdssessioner. Læs den ved start af hver ny session sammen med CLAUDE.md.

**Sidst opdateret:** 28. april 2026
**Sidst aktive sessioner:** 22. april 2026 (env-konsolidering + organisations) og 28. april 2026 (bids-RLS-konsolidering)

---

## Hvor vi står lige nu

### ✅ Database-fundament i drift

Følgende migrations er pushed og verificeret mod remote Supabase (eu-north-1):

| Migration | Indhold |
|-----------|---------|
| `20260417120000_add_active_role_and_full_name` | Pre-existing, registreret som applied via repair |
| `20260417120001_audit_logs_insert_policy` | Service role INSERT-policy på audit_logs |
| `20260417120002_organisations_and_membership` | Multi-tenant fundament |
| `20260428143000_bids_consolidation` | Bids-RLS efter sikkerhedsaudit |

### ✅ Database-tilstand

- 3 tabeller fra organisations-migrationen: `organisations`, `organisation_types`, `organisation_members`
- 6 RPC-funktioner: 3 helper (get_my_*_organisation_ids), 1 owner-trigger (on_organisation_created), 2 audit-triggers, 2 bids-relaterede (get_bid_metadata_for_tender, update_bid_status), 1 audit-trigger (audit_bid_change)
- 14 RLS-policies på tværs af tabellerne
- 1 enum: `organisation_member_role` (owner, admin, editor, viewer)
- 3 seed-rækker i organisation_types: housing_association, municipality, public_body_other

### ✅ ERST-status

- PREPROD-adgang permanent (bekræftet via mail 28. april)
- PROD-adgang tildelt 28. april (afventer faktiske credentials)
- Funktionel test bestået (commit b993e72: DKE3 og DKE0)
- Ingen retest nødvendig ved interne datamodel-ændringer

---

## Det vigtigste at vide før næste session

### 🔴 PROD-credentials kan være landet siden sidst

Tjek mailboksen først. Hvis credentials er ankommet:
- De skal **ikke** sættes i `.env.local` før vi har lavet PROD/PREPROD-adskillelse
- Risiko: utilsigtet publicering til den danske udbudsportal

### 🔴 API-kode er IKKE opdateret til ny RLS-model

Den eksisterende kode i `src/app/api/bids/` bruger direkte `from('bids').select(...)` og `.update(...)`. Med ny RLS:
- Buyer SELECT virker kun efter deadline (RLS blokerer før)
- Buyer UPDATE er totalt blokeret — skal kalde `update_bid_status()` RPC
- Pre-deadline metadata for buyer skal hentes via `get_bid_metadata_for_tender()` RPC
- Bid-submission skal sætte `created_by = auth.uid()` (ny kolonne, RLS kræver det)

**Konsekvens:** Hvis nogen prøver det eksisterende UI nu, vil flere flows fejle. Det er OK — tabellen er tom, ingen brugere — men UI'en skal opdateres før første kunde.

### 🟠 Pre-existing teknisk gæld

Dokumenteret i CLAUDE.md (sektion "Kendt teknisk gæld — skal adresseres før produktion"):
- Pre-existing RLS-policies på `public`-rolle (audit_logs, profiles, tender_documents, tender_questions, tenders) — ikke auditeret endnu
- migrations_old/-mappen ikke CLI-tracked
- audit_logs.actor_type mangler dedikeret kolonne (midlertidigt i metadata.actor_type)
- tenders.organisation_id mangler FK-constraint
- tenders.status er fri TEXT-kolonne uden enum/CHECK-constraint

### 🟠 Suppliers-organisationsmodel mangler

`bids.supplier_id` peger lige nu på `auth.users(id)` direkte. Det skal i fremtidig migration ændres til at pege på en organisations-baseret model. Dette er kommenteret i `20260428143000_bids_consolidation.sql`.

---

## Næste session — prioriteret to-do

### Prioritet 1: PROD/PREPROD-adskillelse (hvis PROD-credentials er landet)

Konkret arbejde:
1. Verificer at `.env.local` adskiller `UDBUD_DK_PREPROD_URL` fra `UDBUD_DK_PROD_URL`
2. Implementer en `getUdbudDkClient(env: 'preprod' | 'prod')`-funktion der eksplicit kræver miljø-valg
3. Erstat alle direkte references til `UDBUD_DK_*_URL` med funktionskald
4. Tilføj guard der forhindrer prod-kald i development-mode
5. Opdatér src/lib/publication/service.ts til ny model
6. Test at PREPROD stadig virker

Estimat: 1-2 timer fokuseret arbejde.

### Prioritet 2: Compliance-status-tjek

Brugeren tjekker selv:
- DPA med Anthropic — er den underskrevet? Er ZDR aktiveret?
- DPA med Resend — er den underskrevet?
- DPA med Supabase — er den underskrevet?
- privatlivspolitik/-mappen — er filen udfyldt eller tom?
- vilkaar/-mappen — er filen udfyldt eller tom?
- Tilgængelighedserklæring — eksisterer den?

Status sendes til AI for vurdering af hvad der mangler.

### Prioritet 3: API-kode opdateret til ny RLS-model

Konkret arbejde:
1. `src/app/api/bids/route.ts` — POST sætter `created_by = user.id`, fjern fallback-bug
2. Buyer-flow: erstat direkte bids-queries med `get_bid_metadata_for_tender()` RPC
3. Buyer-evaluering: erstat direkte UPDATE med `update_bid_status()` RPC
4. Kør `npx tsc --noEmit` og verificer ingen typefejl
5. Manuel test af bid-submission og listing

Estimat: 2-3 timer fokuseret arbejde.

### Prioritet 4: Suppliers-organisationsmodel

Større arkitekturarbejde. Kræver designsamtale før kode. Indebærer:
- Beslutte om suppliers er `organisations` med ny `type_code`, eller separat tabel
- Ny migration der tilføjer `bids.supplier_organisation_id`
- Drop `bids.supplier_id` FK til auth.users, erstat med organisationsreference
- Opdater RLS-policies tilsvarende

Estimat: 3-5 timer inkl. design og review.

### Prioritet 5: Audit af pre-existing policies på public-rolle

For hver tabel med policies på `public`-rolle:
1. Hent USING-klausuler via Supabase SQL Editor
2. Vurder om de faktisk lækker
3. Lav rettelses-migration hvis nødvendigt

Tabeller: audit_logs, profiles, tender_documents, tender_questions, tenders.

Estimat: 2-4 timer.

---

## Forventede prompts til Claude Code ved næste session

### Sessionsstart-prompt (kopiér og brug)

```
Det er ny session. Læs CLAUDE.md og SESSION_NOTES.md først, og bekræft kort at du har læst begge.

Derefter:
1. Kør `npm run check-db` og bekræft at fundamentet stadig virker
2. Kør `git status` og rapportér tilstanden
3. Bekræft at vi er på branch `cursor-automation` (eller anden hvis brugeren angiver)
4. Spørg brugeren hvilken prioritet fra to-do-listen vi tager først

STOP og afvent valg af prioritet før du går i gang med konkret arbejde.
```

---

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

---

## Kontekst-noter

- **Pilotkunde-mål:** 1-2 måneder, ambitionen er en mindre boligorganisation via BL eller KAB, eller DSB (long shot)
- **Compliance før brugere:** brugeren accepterer ikke at åbne for kunder før compliance er på plads
- **AI-evaluering:** ikke kritisk vej, tilvalg, kommer senere
- **Branch-strategi:** stadig på `cursor-automation` — overvej at skifte til `main` med PR-flow når MVP er klar

## Kommunikationspræferencer

- Dansk hvor muligt
- Brutal ærlighed, ingen ekkokammer
- Markér eksplicit hvad der kan delegeres til Claude Code vs. menneske-kun
- Strategiske beslutninger ligger hos mennesket
- Push og commit-beslutninger ligger hos mennesket
