# SCHEMA-DESIGN.md

**Version:** 1.0
**Dato:** 26. maj 2026
**Status:** Låst
**Projekt:** eu-tender-platform (Mercurry Tender)

---

## Om dette dokument

Dette dokument indfanger schema-designbeslutninger truffet i Rute C-protokollen 20. og 26. maj 2026. Det er en **designspecifikation**, ikke implementeringskode. Migrations-DDL skrives separat i `supabase/migrations/` i fasen 28.-31. maj.

Dokumentet fungerer som:

1. Referencepunkt for migrations-fasen
2. Onboarding-materiale for kommende Claude Code-sessioner (læses sammen med CLAUDE.md)
3. Beslutningslog der dokumenterer **hvorfor** valgene blev truffet, ikke kun hvad de er

Beslutninger er låst og bør ikke genåbnes uden eksplicit ny evidens.

---

## Sektion 1: Cross-cutting

### 1.1 Formål og scope

#### Formål

Specificere de database-schema-ændringer der er besluttet for at:

- Rydde teknisk gæld fra Cursor-perioden (specifikt `leads`-tabellen og ufuldstændig tilbudsgiver-model)
- Etablere fundament for evalueringsflow, tildelingsflow og notifikationsflow
- Etablere lokalt søge-indeks for udbudsbekendtgørelser, da ERST ikke tilbyder søge-API
- Indlejre regulatoriske krav (BEK 1572, udbudsloven §§ 170-171) direkte i datamodellen frem for at lade dem leve som applikationslogik alene

#### Scope (in scope)

8 references dækket i dette dokument:

| # | Reference | Kerneindhold |
|---|-----------|--------------|
| 1 | leads-rydning | Slet `leads` permanent |
| 2 | publication audit | `publication_events` + status-felter på `tenders` |
| 3 | evaluation documents | `evaluation_documents` + `document_type`-enum |
| 4 | tender phases | `tender_phases` + `phase_type`-enum |
| 5 | supplier-model | `supplier_organisations`, `supplier_organisation_users`, `tender_participants` + bids-refaktor |
| 6 | tildelings-flow | `tender_lots.awarded_bid_id` + `award_bid` + `cancel_award` RPCs |
| 8 | notifications | Komplet underretningsmodel (§ 170 award, § 171 standstill, annullering) |
| 9 | DKUDBUD lokal sync | `notices` + `sync_state` + tsvector-søgning |

#### Scope (out of scope)

Følgende behandles **ikke** i dette dokument:

- Migrations-SQL (skrives separat i `supabase/migrations/`)
- RLS-policy-detaljer (skrives som del af hver migration; cross-cutting RLS-strategi er noteret i §1.2)
- UI-implementering og forretningslogik på applikationsniveau
- TED-integration (#9.1: udskudt til v2; behandles ikke her)
- Webhook-mekanisme på DKUDBUD-sync (#9.2: forward-compatible men ikke i v1)

#### Konflikt-håndtering

Hvis et designvalg i dette dokument konflikter med eksisterende kode eller migrations, gælder **dette dokument**. Eksisterende kode tilpasses, ikke omvendt. Dette gælder specifikt for:

- `bids.supplier_id` (eksisterende, refaktoreres bort jf. #5)
- Eventuel manuel state-håndtering i evaluate-route der skal flyttes til RPC (#6)

---

### 1.2 Konventioner

#### Navngivning

| Element | Konvention | Eksempel |
|---------|-----------|----------|
| Tabeller | `snake_case`, plural | `tenders`, `bids`, `procurement_notifications` |
| Kolonner | `snake_case`, singulær | `tender_id`, `created_at` |
| FK-kolonner | `{tabel_singular}_id` | `tender_id` refererer `tenders.id` |
| Enums (type) | `snake_case` | `phase_type`, `notification_type` |
| Enum-værdier | `snake_case` | `under_evaluation`, `pending_send` |
| Indexes | `idx_{tabel}_{kolonner}` | `idx_notices_published_at` |
| Unique constraints | `uq_{tabel}_{kolonner}` | `uq_tender_participants_tender_supplier` |
| Foreign keys | `fk_{tabel}_{ref_tabel}` (auto-genereret OK) | — |
| RPCs | `verb_noun` | `award_bid`, `cancel_award` |
| Triggers | `trg_{tabel}_{event}` | `trg_bids_validate_status` |
| Zod-schemas | `{tabel}.{kolonne}.schema.ts` | `procurement_notifications.payload.schema.ts` |

#### Datatyper

- **Primary keys:** Altid `uuid`, default `gen_random_uuid()`. Aldrig serial/bigserial.
- **Timestamps:** Altid `timestamptz`. Aldrig `timestamp` uden tz.
- **Strenge:** `text` som default. Brug `varchar(n)` kun hvor en konkret forretningsmæssig længdebegrænsning gælder (fx CVR-nummer = 8 tegn).
- **JSON:** Altid `jsonb`, aldrig `json`. Valideres via zod på applikationsniveau før insert.
- **Enums:** Postgres-native `CREATE TYPE ... AS ENUM`, ikke text + check-constraint. Begrundelse: type-sikkerhed gennem til Supabase types.ts; fejl fanges ved compile-time.
- **Penge:** `numeric(14,2)` for danske kroner. Aldrig float/double.
- **Boolean defaults:** Eksplicit `DEFAULT false` eller `DEFAULT true` — aldrig nullable boolean medmindre der findes en reel tre-værdi-semantik.

#### Foreign keys

- **ON DELETE:** Eksplicit valg pr. relation. Default `RESTRICT`. `CASCADE` kun hvor child-rækken er meningsløs uden parent (fx `tender_lots` slettes hvis `tenders` slettes).
- **ON UPDATE:** Altid `CASCADE`. PKs ændres aldrig i praksis, men billig forsikring.
- **Self-referencing FKs:** Tilladt (fx `procurement_notifications.parent_notification_id`), men undgå dybe hierarkier.
- **Soft-delete:** Foretrækkes ikke som standard. Status-enums og `deleted_at`-mønster kun hvor lovkrav (audit) eller forretningskrav (genoprettelse) tilsiger det.

#### Row Level Security

- **Default:** RLS aktiveret på alle nye tabeller via `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
- **Policy-target:** `TO authenticated` som default. Aldrig `TO public` eller `TO anon` medmindre eksplicit offentlig læseadgang er forretningskravet (fx published notices).
- **Service-key bypass:** Service-key bypasser RLS. Bruges **kun** server-side i kontrollerede admin-flows. Aldrig eksponeret til klient.
- **Helper-funktioner:** Brug `auth.uid()`, `auth.jwt()` og custom helpers i `auth`-schema hvor muligt. Undgå at duplikere autorisationslogik i hver policy.

⚠️ **Bemærk:** Eksisterende RLS-gæld (policies anvendt på `public` i stedet for `authenticated`) er dokumenteret i CLAUDE.md §"Kendt teknisk gæld" og adresseres separat, ikke som del af disse migrations.

#### JSONB-validering

Hver `jsonb`-kolonne har en navngiven zod-schema i `src/lib/schemas/`:

- Filplacering: `src/lib/schemas/{tabel}.{kolonne}.schema.ts`
- Eksporterer: navngivet `{TabelKolonne}Schema` (PascalCase) + tilhørende TypeScript-type
- Validering: skal køre ved write (insert/update via RPC eller route), ikke ved read
- Migrationsdisciplin: zod-schema-fil skal eksistere i samme commit som migration der introducerer JSONB-kolonnen

Eksempel:

```typescript
// src/lib/schemas/procurement_notifications.payload.schema.ts
export const ProcurementNotificationPayloadSchema = z.discriminatedUnion('type', [
  AwardDecisionPayloadSchema,
  StandstillPayloadSchema,
  CancellationPayloadSchema,
  // ...
]);
export type ProcurementNotificationPayload = z.infer<typeof ProcurementNotificationPayloadSchema>;
```

#### Indexes

- **FK-kolonner:** Indekseres eksplicit. Postgres laver det IKKE automatisk.
- **Hot-path queries:** Indekseres når query-plan viser sequential scan på tabel >1000 rækker.
- **GIN:** Anvendes på `tsvector`-kolonner (#9) og jsonb-kolonner hvor structured queries er hyppige.
- **Composite indexes:** Defineres med kolonner i den rækkefølge queries filtrerer (mest selektive først).
- **Partial indexes:** Anvendes hvor en query altid filtrerer på et bestemt status-felt (fx `WHERE status = 'active'`).

#### Audit-felter

Standard audit-felter på alle nye tabeller:

```sql
created_at  timestamptz NOT NULL DEFAULT now()
updated_at  timestamptz NOT NULL DEFAULT now()
created_by  uuid REFERENCES auth.users(id)  -- nullable hvor system-genereret
updated_by  uuid REFERENCES auth.users(id)
```

`updated_at` opdateres via trigger (`trg_{tabel}_set_updated_at`). Trigger-funktion `tg__set_updated_at()` defineres én gang globalt og genbruges.

#### Brutal ærlighed om disciplin

Disse konventioner er ikke gentlemen's agreements. De er kontrakter med kommende Claude Code-sessioner og fremtidigt-dig. Brud accepteres kun hvis bruddet selv dokumenteres med begrundelse i migration-kommentaren. **Konsistens er vigtigere end mikro-optimering.**

---

### 1.3 Ordliste

Terminologi der bruges i dette dokument og i Mercurry Tender generelt.

| Term | Betydning |
|------|-----------|
| **Ordregiver** | Den juridiske enhed der gennemfører udbuddet (kommune, alment boligselskab, offentligretligt organ). |
| **Tilbudsgiver / leverandør** | Den juridiske enhed der afgiver tilbud. I datamodellen: `supplier_organisations`. |
| **Buyer (rolle)** | Bruger med rolle hos ordregiver. Har CRUD på tenders ejet af egen organisation. |
| **Supplier (rolle)** | Bruger med rolle hos tilbudsgiver. Tilknyttet via `supplier_organisation_users`. |
| **Tender** | Et udbud (hoved-entitet). Kan have flere lots. |
| **Lot (delaftale)** | Selvstændig kontrakt-enhed under et tender. Kan tildeles individuelt. |
| **Bid (tilbud)** | Tilbud afgivet af en `supplier_organisation` på et `tender_lot`. |
| **Notice (bekendtgørelse)** | Officiel publikation af et udbud. Kan være eget-publiceret eller hentet fra DKUDBUD-sync. Ikke at forveksle med `procurement_notifications` (interne underretninger). |
| **Procurement notification** | Intern underretning sendt fra ordregiver til tilbudsgiver(e) under udbudsprocessen — fx tildelingsmeddelelse (§ 170), standstill-meddelelse (§ 171), annullering. |
| **Standstill** | Den lovpligtige ventetid mellem tildelingsbeslutning og kontrakt-underskrift. 10 kalenderdage ved elektronisk levering (udbudsloven § 3, jf. klagenævnsloven § 3). |
| **Klagefrist** | Frist for indgivelse af klage til Klagenævnet for Udbud. Forankret i `legal_received_at` på `notification_deliveries`. |
| **Phase (fase)** | Tidsafgrænset livscyklus-tilstand for et tender (fx `evaluation`, `standstill`, `awarded`). Realiseret som `tender_phases`-rækker. |
| **eForms** | EU-standard XML-format for udbudsbekendtgørelser (forordning 2019/1780). |
| **DKUDBUD** | Den nationale danske udbudsportal (Udbud.dk) drevet af ERST. Også brugt som kilde-identifier i `fraKilde/{DKUDBUD}`-endpoint. |
| **ERST** | Erhvervsstyrelsen, ejer af Udbud.dk og udbyder af API-platformen. |
| **TED** | Tenders Electronic Daily — EU's officielle bekendtgørelsesportal. Integration udskudt til v2. |
| **CVR-nummer** | Centralt VirksomhedsRegister-nummer, 8 cifre. Unik identifier for danske juridiske personer. |
| **ESPD** | European Single Procurement Document — standardiseret egnethedserklæring. |
| **Pull-cron** | Periodisk hent fra ekstern kilde (modsat push/webhook). Brugt for DKUDBUD-sync i v1. |
| **B1 → B3** | Sync-strategi: start med fuld refresh (B1), migrer til hybrid inkrementel+nattlig fuld (B3) når ERST bekræfter `from`-parameter på `fraKilde`-endpoint. |

---

### 1.4 Migrations-rækkefølge

Rækkefølgen er **bindende**. Afhængigheder forklarer hvorfor.

| # | Migration | Indhold | Afhænger af | Reference |
|---|-----------|---------|-------------|-----------|
| 1 | `drop_leads` | Slet `leads`-tabel permanent | Ingen | #1 |
| 2 | `supplier_organisations_base` | `supplier_organisations` + `supplier_organisation_users` | Ingen | #5 fundament |
| 3 | `tender_participants` | `tender_participants` | #2 | #5 |
| 4 | `bids_supplier_refactor` | Add `bids.supplier_organisation_id`, backfill, drop `supplier_id` | #2, #3 | #5 afslutning |
| 5 | `tender_phases` | `tender_phases` + `phase_type`-enum | Ingen (parallel med #2-#4) | #4 |
| 6 | `evaluation_documents` | `evaluation_documents` + `document_type`-enum | Ingen (parallel) | #3 |
| 7 | `publication_events` | `publication_events` + `tenders.publication_status`-felter | Ingen (parallel) | #2 |
| 8 | `awarded_bid_and_rpcs` | `tender_lots.awarded_bid_id` + `award_bid`-RPC + `cancel_award`-RPC | #4 (bids-refactor færdig) | #6 |
| 9 | `notices_and_sync` | `notices` + `sync_state` + GIN-indexes + tsvector | Ingen (selvstændig) | #9 |
| 10 | `procurement_notifications_full` | Alle 8.x-tabeller + `send_procurement_notification`-RPC | #5 (recipients ref. organisations) | #8 |

#### Rationale for rækkefølgen

- **#1 først:** Rydning. Lille risiko, klar fundament. Hvis kode stadig refererer `leads`, skal det fanges nu.
- **#2-#4 som sammenhængende blok:** Refaktorerer `bids.supplier_id` → `supplier_organisation_id`. Split i 3 migrations for atomicitet og rollback-evne. Skal køres i samme deploy-vindue.
- **#5-#7 parallelt:** Uafhængige nye tabeller. Kan dybest set merges til samme migration hvis vi vil reducere antal commits — men holdes adskilt for læsbarhed.
- **#8 efter #4:** `awarded_bid_id` refererer `bids.id`, og RPC opererer på den nye supplier-model.
- **#9 selvstændig:** `notices` har ingen FK til andre nye tabeller. Kan i princippet køres når som helst, men placeres sent for at undgå at blokere andre migrations ved fejl.
- **#10 sidst:** `notification_recipients` refererer `supplier_organisations` (#2). Den længste migration, mest risiko, sidst.

#### Forventet kaskade

Efter hver migration skal `npm run db:types` (eller `scripts/gen-types.mjs`) køres. Hvis types.ts-regenerering fejler, stop migrationen og diagnosticer før næste køres. **Migrations er ikke "færdig" før types.ts er opdateret og kode kompilerer.**

#### Rollback-strategi

Hver migration har en omvendt-migration (downward) klar i kommentar eller separat fil. Specielt #4 (bids-refactor) skal kunne rolles tilbage hvis backfill fejler — dvs. ny kolonne dropes, gammel `supplier_id` bevares indtil eksplicit drop i opfølgende migration.

---

### 1.5 Infrastructure prerequisites

Følgende skal være på plads **før** de relevante migrations deployes til PROD.

| Krav | Påkrævet af | Status | Deadline |
|------|-------------|--------|----------|
| Vercel Pro-upgrade ($20/mdr) | #9 (cron 30 min) | Ikke gennemført | 8. juni 2026 |
| Supabase Vault konfigureret | #9 (ERST Basic Auth secrets) | Delvist | Før #9 deploy |
| Point-in-Time Recovery aktiveret + restore-test kørt | #4 (bids-refactor) | PITR aktiveret; restore-test ikke verificeret | Før #4 deploy mod PROD |
| Zod-schema-filer eksisterer | #8, #9 (jsonb-kolonner) | Ikke skrevet | Samme commit som migration |
| `scripts/gen-types.mjs` virker uden BOM | Alle migrations | ✅ Bekræftet 20. maj (commit 482814b) | — |
| pg_cron extension | Ingen (Vercel cron dækker) | Ikke aktiveret | Beslutning udskudt |
| `db:types` npm-script production-ready | Alle migrations | ✅ Bekræftet 20. maj | — |
| ERST PROD-credentials bekræftet identiske med PREPROD | #9 (sync mod PROD) | ✅ Bekræftet 26. maj | — |

#### Bemærkninger

- **PITR restore-test:** Skal køres mod et non-prod-snapshot inden #4 køres mod PROD. Bids-refactor er den eneste migration med ægte data-mutation (backfill). Hvis backfill fejler stille, vil vi opdage det først ved næste evaluation-flow — for sent. Restore-test verificerer at vi kan rulle tilbage.
- **Vercel cron-frekvens:** Hobby-tier tillader kun 1x daglig cron. #9 forudsætter 30 min default. Pro-upgrade er låst (jf. SESSION_NOTES.md 26. maj).
- **Zod-schema disciplin:** Hvis en jsonb-kolonne introduceres uden tilhørende zod-schema, er det at betragte som en regression. Migrationens commit-besked skal nævne schema-filen.

---

### 1.6 Samlet tabel-oversigt

#### Operationer pr. tabel

| Tabel | Operation | Reference | Bemærkning |
|-------|-----------|-----------|------------|
| `leads` | **DROP** | #1 | Slet permanent. Ingen data-migrering. |
| `supplier_organisations` | **NEW** | #5 | Fundament for tilbudsgiver-virksomheds-model |
| `supplier_organisation_users` | **NEW** | #5 | M:N user ↔ supplier_organisation |
| `tender_participants` | **NEW** | #5 | Aktive tilbudsgivere på et tender |
| `bids` | **ALTER** | #5 | `supplier_id` → `supplier_organisation_id` (med backfill) |
| `tender_phases` | **NEW** | #4 | Livscyklus-faser |
| `evaluation_documents` | **NEW** | #3 | Bilag knyttet til evaluation (frivillige) |
| `publication_events` | **NEW** | #2 | Audit-log for publicering |
| `tenders` | **ALTER** | #2, #9 | +`publication_status`, `last_published_at`, `current_notice_id` |
| `tender_lots` | **ALTER** | #6 | +`awarded_bid_id`, `awarded_at` |
| `notices` | **NEW** | #9 | Lokalt søge-indeks (DKUDBUD + eget-publicerede) |
| `sync_state` | **NEW** | #9 | Sync-status pr. kilde |
| `procurement_notifications` | **NEW** | #8 | Underretninger (typed JSONB payload) |
| `notification_recipients` | **NEW** | #8 | Hvem skal modtage |
| `notification_deliveries` | **NEW** | #8 | Faktisk levering (kanal-niveau) |
| `notification_templates` | **NEW** | #8 | System + custom org-templates |
| `notification_attachments` | **NEW** | #8 | Shared/individual bilag |

#### Nye enums

| Enum | Reference | Værdier (foreløbig) |
|------|-----------|---------------------|
| `phase_type` | #4 | `preparation`, `published`, `q_and_a`, `submission_open`, `evaluation`, `standstill`, `awarded`, `cancelled`, `archived` |
| `document_type` | #3 | `tender_material`, `bid`, `q_and_a`, `letter`, `evaluation_note`, `other` |
| `publication_status` | #2 | `draft`, `validating`, `validation_failed`, `publishing`, `published`, `correction_pending`, `cancelled` |
| `notice_status` | #9 | `active`, `corrected`, `cancelled`, `archived` |
| `notification_type` | #8.1 | `award_decision`, `standstill_notice`, `rejection`, `cancellation`, `correction`, `general` |
| `notification_state` | #8.3 | `draft`, `pending_send`, `sent`, `partially_failed`, `failed` |
| `delivery_channel` | #8.2 | `platform_inbox`, `email` |
| `delivery_status` | #8.2 | `pending`, `sent`, `bounced`, `failed`, `read_in_inbox` |

#### Nye RPCs

| RPC | Reference | Formål |
|-----|-----------|--------|
| `award_bid(bid_id uuid)` | #6 | Atomisk tildeling: sætter `awarded_bid_id`, opdaterer bid-status, markerer øvrige bids på lot som `not_awarded`, opretter `tender_phases`-overgang |
| `cancel_award(lot_id uuid)` | #6 | Rul tildeling tilbage atomisk (kun før kontrakt-underskrift) |
| `send_procurement_notification(notification_id uuid)` | #8.3 | Transit fra `pending_send` → `sent`; opretter `notification_deliveries`-rækker; trigger SMTP-send |

#### Nye triggers (centrale)

| Trigger | Tabel | Event | Funktion |
|---------|-------|-------|----------|
| `trg_{tabel}_set_updated_at` | Alle nye tabeller | BEFORE UPDATE | Opdater `updated_at` |
| `trg_tender_phases_validate_transition` | `tender_phases` | BEFORE INSERT | Verificer at fase-overgang er lovlig jf. state-machine |
| `trg_bids_block_after_award` | `bids` | BEFORE UPDATE | Bloker bid-ændringer efter lot er awarded |
| `trg_notifications_validate_state` | `procurement_notifications` | BEFORE UPDATE | Verificer state-machine `draft → pending_send → sent` |

---

**Slut på Sektion 1.**
---

## Sektion 2: Reference #1 — leads-rydning

### Status

Låst 26. maj 2026.

### Konflikt-risiko

🟢 Lav. `leads`-tabellen er ikke i aktiv brug. Risikoen er udelukkende at refererende kode (hvis nogen) fejler ved compile-tid efter `types.ts`-regenerering.

Risikofaktorer:

- `src/lib/supabase/types.ts` indeholder hand-written stub for `leads` (jf. SESSION_NOTES.md tidligere notater)
- Ingen kendte aktive code-paths kalder `leads`, men det er ikke verificeret med fuld grep

### Kode-referencer

Skal verificeres som del af migration:

```
grep -r "from('leads')" src/
grep -r "leads\." src/
grep -rn "leads" src/lib/supabase/types.ts
```

Forventet resultat: 0 hits i `src/` (eksklusive `types.ts`-stub som overskrives).

### Brugerhistorie

> Som udvikler vil jeg fjerne `leads`-tabellen permanent, fordi den er teknisk gæld fra en tidlig fase hvor vi overvejede en CRM-light-funktion der ikke længere er på roadmap. Tabellen står tom og gør schema-billedet uklart for kommende sessioner.

### Designvalg

To muligheder blev overvejet:

| Mulighed | Pro | Kontra |
|----------|-----|--------|
| A: Slet permanent | Klart fundament, ingen tvivl om hvad der er aktivt | Ingen rollback hvis vi alligevel skal genintroducere |
| B: Behold som "deprecated", flyt til schema `_archive` | Bevarer optionalitet | Vedligeholder en død tabel; signaler "måske kommer den tilbage" |

**Valgt:** A — slet permanent. Begrundelse: ingen reel sandsynlighed for genintroduktion; hvis CRM-funktion engang kommer, designes den fra bunden ud fra det daværende behov.

### Beslutning

**Migration:** `drop_leads`

```sql
DROP TABLE IF EXISTS public.leads CASCADE;
```

Skema-skitse:

```
leads  ─────────────  [SLETTES]
```

Ingen ny tabel introduceres. Ingen data-migrering.

### Opfølgning

- [ ] Grep verifikation før migration køres
- [ ] `types.ts`-regenerering efter migration (skal IKKE længere indeholde `leads`)
- [ ] Spot-check af build: `npm run typecheck` skal stadig kompilere
- [ ] Commit-besked: `chore(db): drop leads-tabel permanent (refaktorerer Cursor-period gaeld)`

---

## Sektion 3: Reference #2 — publication_events + tender status-felter

### Status

Låst 26. maj 2026.

### Konflikt-risiko

🟡 Medium. Påvirker `tenders`-tabellen (alter), og publication-flow-koden i `src/lib/publication/service.ts` skal opdateres til at skrive til `publication_events` ved hvert API-kald mod ERST.

Risikofaktorer:

- `service.ts` har eksisterende TODO om payload-format mismatch (XML vs. JSON) der bør tackles før denne migration ramler ind i samme kodefil
- `publication_jobs`-stubben i `types.ts` (legacy fra Cursor-perioden) er ikke samme tabel som `publication_events`; skal ikke forveksles

### Kode-referencer

- `src/lib/publication/service.ts` — primær konsument
- `src/lib/publication/udbud-dk-client.ts` — kald-stedet der genererer events
- `src/lib/supabase/types.ts` — skal regenereres

### Brugerhistorie

> Som ordregiver vil jeg kunne se en revisionssikker historik over alle publicerings-handlinger på et udbud — validér-forsøg, publicer-forsøg, korrektioner, annulleringer — så jeg kan dokumentere overholdelse af BEK 1572 og lovgive over for klagenævn hvis nødvendigt. Jeg vil også kunne se på et udbud i list-view hvad dets publicerings-status er uden at skulle åbne event-historikken.

### Designvalg

#### Status-felter direkte på `tenders` vs. udelukkende afledt fra events

| Mulighed | Pro | Kontra |
|----------|-----|--------|
| A: Status afledt af seneste event | Single source of truth | Dyrt at queries på listevisninger; kræver join hver gang |
| B: Status-felter på `tenders` opdateret af trigger fra `publication_events` | Hurtig query; let UI; events forbliver audit-sandhed | Skal vedligeholde konsistens via trigger |

**Valgt:** B. Begrundelse: list-views (kommune-dashboard med 50+ udbud) skal kunne loades hurtigt. Trigger sikrer konsistens.

#### Event-granularitet

Hver event-række repræsenterer ét API-kald mod ERST (eller intern handling). Validér + publicer i samme transaktion → 2 events.

### Beslutning

**Migration:** `publication_events`

```
publication_events
├── id                    uuid PK
├── tender_id             uuid FK → tenders (NOT NULL, ON DELETE RESTRICT)
├── event_type            text       -- 'validate_request', 'validate_response', 'publish_request', 'publish_response', 'correction', 'cancellation'
├── http_status           int        -- nullable for non-HTTP events
├── notice_id             text       -- ERST-tildelt notice-id (når relevant)
├── sdk_version           text       -- eforms-sdk-dk-1.13.0-1.3.0 ved publicering
├── request_payload_hash  text       -- SHA-256 hash, ikke fuld payload (privatliv + størrelse)
├── response_summary      jsonb      -- status, fejlbeskrivelser, ikke fuldt response-body
├── error_details         jsonb      -- nullable; ved fejl: schematron-errors etc.
├── occurred_at           timestamptz NOT NULL DEFAULT now()
├── triggered_by          uuid FK → auth.users (nullable for system-cron)
└── (standard audit-felter)
```

**Alter `tenders`:**

```
tenders
├── (eksisterende kolonner)
├── publication_status      publication_status  DEFAULT 'draft'  NOT NULL
├── last_published_at       timestamptz         NULL
├── current_notice_id       text                NULL   -- aktiv notice fra ERST
└── last_publication_error  text                NULL   -- seneste fejl-summary for UI-display
```

**Enum:**

```sql
CREATE TYPE publication_status AS ENUM (
  'draft',
  'validating',
  'validation_failed',
  'publishing',
  'published',
  'correction_pending',
  'cancelled'
);
```

**Trigger:** `trg_publication_events_update_tender_status` — opdaterer `tenders.publication_status` baseret på event-type og `http_status`.

**Indexes:**

```
idx_publication_events_tender_id_occurred_at  ON (tender_id, occurred_at DESC)
idx_tenders_publication_status                ON (publication_status) WHERE publication_status != 'draft'
```

### Opfølgning

- [ ] Zod-schema-fil for `publication_events.response_summary` og `error_details`
- [ ] `service.ts` opdateres til at skrive events ved hvert kald (denne refaktorering hænger sammen med XML-payload-rewrite)
- [ ] UI-komponent til at vise event-historik på tender-detail-side (post-migration arbejde)
- [ ] Forholdet til legacy `publication_jobs`-stub i `types.ts`: dokumentér i types.ts-overskrivning at den er ophævet, ikke erstattet (de er forskellige koncepter)

---

## Sektion 4: Reference #3 — evaluation_documents + document_type-enum

### Status

Låst 26. maj 2026.

### Konflikt-risiko

🟢 Lav. Frivilligt felt — kode der ikke benytter `evaluation_documents` påvirkes ikke.

### Kode-referencer

- Ingen eksisterende konsumenter
- AI-evalueringsflow vil potentielt referere `document_type` for kontekstuel feedback (post-migration)

### Brugerhistorie

> Som ordregiver vil jeg under evalueringen kunne uploade interne dokumenter (fx evalueringsnotater, advokat-vurderinger) der er knyttet til et bid eller en kommunikation, og som er adskilt fra udbudsmaterialet og tilbudsbilag. De skal være typesikret med en klar enum så jeg ikke selv skal vedligeholde fri-tekst-kategorier, og så AI-evalueringen senere kan filtrere på dokumenttype.

### Designvalg

#### Hvorfor en separat tabel og ikke en kolonne på `tender_documents`?

`tender_documents` er udbudsmateriale (kravspecifikation, kontraktudkast etc.) — eksternt synligt. Evaluation-dokumenter er **interne** og må aldrig deles med tilbudsgivere. Adskilte tabeller giver:

- Klar RLS-grænse (`evaluation_documents` aldrig tilgængelig for supplier-rolle)
- Forskellig storage-bucket-strategi mulig
- Forenklet audit (intern vs. ekstern dokumenthåndtering)

#### Enum vs. text

Enum valgt jf. konventionerne (§1.2). Begynder med 6 værdier; udvidelse kræver ny migration (med vilje — vi vil ikke have ad-hoc kategorier).

### Beslutning

**Migration:** `evaluation_documents`

```
evaluation_documents
├── id              uuid PK
├── tender_id       uuid FK → tenders (NOT NULL, ON DELETE CASCADE)
├── bid_id          uuid FK → bids (NULL — kun sat hvis dokument er bid-specifikt)
├── communication_id uuid FK → communications (NULL — kun sat hvis dokument er Q&A-specifikt)
├── document_type   document_type NOT NULL
├── storage_path    text NOT NULL          -- Supabase Storage bucket-path
├── filename        text NOT NULL
├── mime_type       text NOT NULL
├── size_bytes      bigint NOT NULL
├── uploaded_by     uuid FK → auth.users NOT NULL
├── notes           text                   -- intern note
└── (standard audit-felter)
```

**Enum:**

```sql
CREATE TYPE document_type AS ENUM (
  'tender_material',     -- intern kopi af udsendt materiale, til evaluation-reference
  'bid',                 -- intern kopi af tilbud, til evaluation-reference
  'q_and_a',             -- intern note til Q&A-håndtering
  'letter',              -- udkast til brev (fx tildelings/afslagsbrev)
  'evaluation_note',     -- evaluators noter
  'other'
);
```

**Constraint:** Mindst ét af `bid_id` eller `communication_id` skal være sat hvis `document_type` er `bid` eller `q_and_a`. Mest enkelt som CHECK constraint, men kan udskydes til applikationslag hvis CHECK bliver for kompleks.

**Indexes:**

```
idx_evaluation_documents_tender_id         ON (tender_id)
idx_evaluation_documents_bid_id            ON (bid_id) WHERE bid_id IS NOT NULL
idx_evaluation_documents_document_type     ON (document_type)
```

**RLS:** Kun buyers tilknyttet `tender.organisation_id` kan SELECT/INSERT/DELETE. Suppliers har ingen adgang.

### Opfølgning

- [ ] Storage-bucket-policy konfigureres: privat bucket, kun tilgængelig via signed URLs
- [ ] UI: upload-komponent på evaluation-side
- [ ] AI-flow refererer `document_type` for kontekstuel evaluering (men kald aldrig direkte AI på `evaluation_note`-typer — risiko for at læse evaluators egne refleksioner ind i AI-prompt)

---

## Sektion 5: Reference #4 — tender_phases

### Status

Låst 26. maj 2026.

### Konflikt-risiko

🟡 Medium. Erstatter ad-hoc state-håndtering der i dag eksisterer som tender-status-text-felt. Eksisterende kode der filtrerer på text-status skal opdateres.

Risikofaktorer:

- Migration skal seede `tender_phases`-rækker for eksisterende tenders baseret på nuværende status
- Trigger-logik for lovlige overgange skal omhyggeligt designes (state-machine)

### Kode-referencer

- Alle steder hvor tender-status læses/skrives
- Specifikt: `award_bid`-RPC (#6) skal oprette `awarded`-fase
- `send_procurement_notification`-RPC (#8.3) for standstill-notification skal oprette `standstill`-fase

### Brugerhistorie

> Som ordregiver vil jeg kunne se hvilken fase mit udbud befinder sig i — forberedelse, publiceret, spørgsmål-runde, tilbudsmodtagelse, evaluation, standstill, tildelt, annulleret — og platformen skal håndhæve at man ikke kan hoppe ulovligt mellem faser (fx ikke kan gå fra `evaluation` direkte til `awarded` uden at have en `standstill`-fase imellem ved over-tærskel-udbud).

### Designvalg

#### En aktuel-fase-pointer på tenders vs. en historik-tabel

| Mulighed | Pro | Kontra |
|----------|-----|--------|
| A: `tenders.current_phase` enum | Simpel | Ingen historik; ingen overgangs-audit |
| B: `tender_phases`-historik-tabel + computed "current" | Fuld historik; audit; nem klagenævns-dokumentation | Lidt mere kompleks; kræver query for "current" |

**Valgt:** B. Begrundelse: udbudsret kræver dokumentation af tidslinjen (fx hvornår standstill startede). Historik er ikke valgfrit.

#### State-machine

Lovlige overgange (graf):

```
preparation ──→ published ──→ q_and_a ──→ submission_open ──→ evaluation
                                                                  │
                                              ┌───────────────────┤
                                              ↓                   ↓
                                          standstill          awarded (direkte ved under-tærskel)
                                              │
                                              ↓
                                          awarded ──→ archived
                                              
              (cancelled kan ramme fra enhver fase EFTER preparation)
              (correction_pending håndteres via publication_status, ikke phase_type)
```

Trigger validerer overgang. Disallowed overgange returnerer SQLSTATE 22023 (mapped til HTTP 400).

### Beslutning

**Migration:** `tender_phases`

```
tender_phases
├── id              uuid PK
├── tender_id       uuid FK → tenders (NOT NULL, ON DELETE CASCADE)
├── phase_type      phase_type NOT NULL
├── started_at      timestamptz NOT NULL DEFAULT now()
├── ended_at        timestamptz                       -- NULL for aktuel fase
├── ends_at_planned timestamptz                       -- forventet slut (fx standstill +10 dage)
├── triggered_by    uuid FK → auth.users              -- NULL for system-trigger
├── reason          text                              -- valgfri kommentar (især for cancelled)
├── metadata        jsonb                             -- fase-specifik kontekst
└── (standard audit-felter)
```

**Enum:**

```sql
CREATE TYPE phase_type AS ENUM (
  'preparation',
  'published',
  'q_and_a',
  'submission_open',
  'evaluation',
  'standstill',
  'awarded',
  'cancelled',
  'archived'
);
```

**Constraint:** Kun én række med `ended_at IS NULL` pr. `tender_id`. Realiseret som partial unique index:

```
uq_tender_phases_one_active  UNIQUE (tender_id) WHERE ended_at IS NULL
```

**Trigger:** `trg_tender_phases_validate_transition` BEFORE INSERT — verificer at den nye `phase_type` er lovlig overgang fra den aktuelle (sidste række med `ended_at IS NULL`). Samtidig sætter trigger den gamle række `ended_at = now()` atomisk.

**Indexes:**

```
idx_tender_phases_tender_id_started_at  ON (tender_id, started_at DESC)
idx_tender_phases_active                ON (tender_id) WHERE ended_at IS NULL
```

#### Helper-funktion

```sql
CREATE FUNCTION get_current_phase(p_tender_id uuid) RETURNS phase_type ...
```

Returnerer aktiv fase. Bruges i RLS-policies og UI-queries.

### Opfølgning

- [ ] Seed-migration: opret initial `tender_phases`-række for hver eksisterende tender baseret på nuværende status-text
- [ ] State-machine-diagram dokumenteres i `docs/STATE-MACHINES.md` (separat dokument, ikke i denne migration)
- [ ] UI-komponent: faseviser på tender-detail
- [ ] Verificer at `award_bid`-RPC (#6) opretter `awarded`-fase atomisk

---

## Sektion 6: Reference #5 — supplier_organisations + tender_participants

### Status

Låst 26. maj 2026. **Genåbnet fra Rute C-beslutning 18. maj** (supplier_id = user.id ERSTATTET).

### Konflikt-risiko

🔴 Høj. Migration omfatter data-mutation (`bids.supplier_id` → `supplier_organisation_id` backfill). Hvis backfill fejler stille, mister vi link mellem bids og leverandører. PITR restore-test SKAL være verificeret før denne migration deployes mod PROD.

Risikofaktorer:

- Eksisterende `bids.supplier_id` peger på `auth.users(id)`. Backfill skal mappe hver bruger til en (måske ny) `supplier_organisations`-række.
- Hvad gør vi med suppliers der har afgivet bid men aldrig oprettet en organisations-profil? **Beslutning:** opret automatisk en "personal_supplier" organisation med CVR=NULL og navn=user.email. Markeres med flag `is_legacy_personal` for senere konsolidering.

### Kode-referencer

- `src/app/api/.../evaluate/route.ts` — `getSupplierId` helper (jf. Rute C 18. maj — returnerer nu `supplier_organisation_id`)
- Alle steder hvor `bids.supplier_id` læses (skal opdateres til `supplier_organisation_id`)
- Supplier-pages (`src/app/tilbudsgiver/`) — list views der filtrerer "mine bids"

### Brugerhistorie

> Som tilbudsgiver-virksomhed (juridisk person) vil jeg kunne have flere medarbejdere tilknyttet samme virksomhed, så vi kan samarbejde om at byde på udbud uden at skulle dele én indlogning. Vores firma identificeres unikt ved CVR-nummer.
>
> Som ordregiver vil jeg kunne se virksomhedsnavn og CVR på de tilbudsgivere der er aktive på mit udbud, ikke kun individuelle bruger-emails.

### Designvalg

#### Hvorfor en separat virksomheds-entitet og ikke bare et felt på user-profilen?

Tre-værdi-argument:

1. **Realitet:** Virksomheder har flere ansatte; CRM-light-tilgang med user-felt fungerer ikke for SMV'er
2. **Juridisk:** Bid afgives af virksomhed, ikke individ. Tildelingsbreve sendes til virksomhed.
3. **Compliance:** ESPD-besvarelse er knyttet til virksomheden, genbruges på tværs af brugere

#### Hvorfor `tender_participants` som separat tabel og ikke bare afledt af `bids`?

En tilbudsgiver kan være "aktiv" på et udbud (har trukket materiale, har stillet spørgsmål) uden endnu at have afgivet bid. `tender_participants` registrerer interesse + giver Q&A-rettigheder. `bids` registrerer den endelige tilbudsafgivelse.

### Beslutning

**Migration:** `supplier_organisations_base`

```
supplier_organisations
├── id                    uuid PK
├── cvr_number            varchar(8)         -- NULL for udenlandske + legacy
├── country_code          char(2) NOT NULL DEFAULT 'DK'
├── foreign_id            text               -- VAT-nummer eller tilsv. for udenlandske
├── legal_name            text NOT NULL
├── address               jsonb              -- struktureret adresse
├── contact_email         text
├── contact_phone         text
├── website               text
├── is_legacy_personal    boolean DEFAULT false  -- markerer auto-oprettede ved backfill
└── (standard audit-felter)

uq_supplier_organisations_cvr  UNIQUE (cvr_number) WHERE cvr_number IS NOT NULL
uq_supplier_organisations_foreign  UNIQUE (country_code, foreign_id) WHERE foreign_id IS NOT NULL
```

```
supplier_organisation_users
├── id                       uuid PK
├── supplier_organisation_id uuid FK → supplier_organisations (NOT NULL)
├── user_id                  uuid FK → auth.users (NOT NULL)
├── role                     text NOT NULL   -- 'owner', 'member' (foreløbig; udvides ved behov)
├── invited_by               uuid FK → auth.users
├── joined_at                timestamptz NOT NULL DEFAULT now()
└── (standard audit-felter)

uq_supplier_org_users  UNIQUE (supplier_organisation_id, user_id)
```

**Migration:** `tender_participants`

```
tender_participants
├── id                       uuid PK
├── tender_id                uuid FK → tenders (NOT NULL, ON DELETE CASCADE)
├── supplier_organisation_id uuid FK → supplier_organisations (NOT NULL)
├── registered_at            timestamptz NOT NULL DEFAULT now()
├── registered_by            uuid FK → auth.users
├── status                   text NOT NULL DEFAULT 'active'  -- 'active', 'withdrawn'
└── (standard audit-felter)

uq_tender_participants  UNIQUE (tender_id, supplier_organisation_id)
```

**Migration:** `bids_supplier_refactor` (kører som SIDSTE i sekvensen #2-#4)

```
bids
├── (eksisterende kolonner)
├── + supplier_organisation_id  uuid FK → supplier_organisations (NULLABLE initialt)
└── (backfill-step: hver bid.supplier_id → opret eller find supplier_organisations-række, opdater bid)
└── (final step: ALTER COLUMN supplier_organisation_id SET NOT NULL; DROP COLUMN supplier_id)
```

Backfill-strategi (3-trin atomisk):

1. Add nullable column
2. Backfill: for hver `bids.supplier_id`, find/opret `supplier_organisations` med `legal_name = (user.email)`, `is_legacy_personal = true`; opret `supplier_organisation_users`-relation; sæt `bids.supplier_organisation_id`
3. NOT NULL + drop gamle kolonne

⚠️ **Disciplin:** Trin 3 sker i SEPARAT migration, dage senere, efter funktionel verifikation. Imellem (trin 2 og 3) kører applikationen mod den nye kolonne men gammel data er stadig bevaret som rollback-buffer.

**Indexes:**

```
idx_bids_supplier_organisation_id        ON (supplier_organisation_id)
idx_tender_participants_supplier_org_id  ON (supplier_organisation_id)
idx_supplier_org_users_user_id           ON (user_id)
```

**RLS-skitse:**

- `supplier_organisations`: SELECT for medlemmer (via `supplier_organisation_users`); UPDATE kun for `role='owner'`
- `supplier_organisation_users`: SELECT for medlemmer af samme org; INSERT kun via invitation-flow (RPC); DELETE kun for owner
- `tender_participants`: SELECT for medlem af `supplier_organisation_id` ELLER buyer på `tender.organisation_id`; INSERT for supplier-medlemmer; DELETE/withdraw kun via dedicated RPC

### Opfølgning

- [ ] PITR restore-test verificeret før PROD-deploy
- [ ] Backfill-strategi dry-run mod staging-snapshot
- [ ] Onboarding-flow for nye suppliers: "opret virksomhed" som første-gang-step
- [ ] Konsolidering af `is_legacy_personal`-orgs: separat post-migration arbejde (forventet over tid efterhånden som brugere opretter rigtige virksomhedsprofiler)
- [ ] UI-opdatering: vis virksomhedsnavn + CVR i alle list-views hvor "supplier" tidligere viste user-email
- [ ] Verificer CLAUDE.md v2.2-opdatering reflekterer dette designvalg (P2 efter denne migration)

---

## Sektion 7: Reference #6 — awarded_bid_id + award_bid-RPC

### Status

Låst 26. maj 2026. **Genåbnet fra Rute C-beslutning 18. maj** (UI-baseret winner-håndtering ERSTATTET).

### Konflikt-risiko

🟡 Medium. RPC erstatter ad-hoc kode der i dag (ikke) findes — så ingen aktiv kode brydes. Men: tæt koblet til #4 (tender_phases) og #5 (bids-refactor). Skal komme EFTER begge.

### Kode-referencer

- `src/app/api/.../evaluate/route.ts` — skal kalde `award_bid`-RPC i stedet for at opdatere bid-status direkte
- UI: tildelings-knap på lot-detail-side

### Brugerhistorie

> Som ordregiver vil jeg, når jeg har truffet tildelingsbeslutning på et lot, kunne markere en vindende bid med ét klik, og platformen skal atomisk:
>
> - Sætte den valgte bid til `winner`
> - Markere alle andre bids på samme lot som `not_awarded`
> - Opdatere lot med `awarded_bid_id` og `awarded_at`
> - Skabe en `tender_phases`-overgang til `awarded` (eller `standstill` hvis over tærskel)
> - Generere en `procurement_notifications` udkast af typen `award_decision` (ikke afsendt; afventer min godkendelse jf. #8)
>
> Hvis noget af dette fejler, må intet af det blive committet — alt-eller-intet.

### Designvalg

#### Hvorfor RPC og ikke trigger-kæde?

Trigger-kæder bliver svære at debugge og kan ramme rekursionsgrænser. En RPC er én eksplicit kontrakt med klar input/output, klare SQLSTATE-codes og klar transaktion. Følger samme princip som Rute C 18. maj: RPC = single source of truth for autorisering.

#### Hvorfor `awarded_bid_id` på `tender_lots` og ikke afledt af bid-status?

- Hurtig query: "vis mig vinderen af lot X" → én lookup, ikke filter+limit
- Klart sandhedsfelt: én lot kan have præcis én vinder (eller ingen)
- Awarded_at separat: tildelingstidspunkt skal kunne dokumenteres uafhængigt af om bid-status senere ændres (fx ved annullering)

#### Skal `cancel_award` rulle alt tilbage?

Ja, atomisk. Men kun lovligt før kontrakt-underskrift. Trigger på `tender_phases` blokerer `cancel_award` hvis fasen `awarded` er afsluttet (dvs. kontrakt-underskrift har fundet sted).

### Beslutning

**Alter `tender_lots`:**

```
tender_lots
├── (eksisterende kolonner)
├── + awarded_bid_id   uuid FK → bids (NULLABLE)
├── + awarded_at       timestamptz NULL
├── + awarded_by       uuid FK → auth.users NULL
└── ...
```

Constraint: `awarded_bid_id` skal pege på en bid hvor `bid.tender_lot_id = tender_lots.id`. CHECK constraint eller trigger.

**RPC:** `award_bid(p_bid_id uuid)`

Pseudo-flow:

```
BEGIN

  -- Autorisation
  Verify caller is buyer on tender.organisation_id (SQLSTATE 42501 if not)

  -- Hent kontekst
  SELECT bid + lot + tender, validate consistency

  -- Pre-conditions
  Verify lot.awarded_bid_id IS NULL (else 22023: already awarded)
  Verify current phase = 'evaluation' (else 22023: wrong phase)
  Verify bid.status IN ('under_evaluation', 'accepted') (else 22023)

  -- Atomic updates
  UPDATE bids SET status='winner' WHERE id = p_bid_id
  UPDATE bids SET status='not_awarded' WHERE tender_lot_id = lot_id AND id != p_bid_id AND status='under_evaluation'
  UPDATE tender_lots SET awarded_bid_id=p_bid_id, awarded_at=now(), awarded_by=auth.uid()
  
  -- Fase-overgang
  IF over_threshold THEN
    INSERT tender_phases (phase_type='standstill', ends_at_planned=now()+'10 days')
  ELSE
    INSERT tender_phases (phase_type='awarded')
  END IF

  -- Generér udkast-notification (ikke afsendt)
  INSERT procurement_notifications (type='award_decision', state='draft', ...)

COMMIT
```

**RPC:** `cancel_award(p_lot_id uuid)`

Pseudo-flow:

```
BEGIN

  Verify caller authorization
  Verify lot.awarded_bid_id IS NOT NULL
  Verify current phase IN ('standstill', 'awarded') AND ended_at IS NULL
  
  UPDATE tender_lots SET awarded_bid_id=NULL, awarded_at=NULL, awarded_by=NULL
  UPDATE bids SET status='under_evaluation' WHERE tender_lot_id = p_lot_id AND status IN ('winner', 'not_awarded')
  INSERT tender_phases (phase_type='evaluation')  -- tilbage til evaluation

  -- Marker draft-notifications som superseded (men slet dem ikke)
  UPDATE procurement_notifications SET state='cancelled_superseded' WHERE tender_id = ... AND type='award_decision' AND state='draft'

COMMIT
```

**SQLSTATE-mapping (jf. Rute C 18. maj):**

- `42501` → HTTP 403 Forbidden
- `22023` → HTTP 400 Bad Request

**Trigger:** `trg_bids_block_after_award` — bid-rækker hvor `tender_lots.awarded_bid_id IS NOT NULL` kan ikke ændres direkte, kun via `cancel_award`-RPC.

**Helper:** `is_over_threshold(p_tender_id uuid) RETURNS boolean` — afgør om udbuddet er over EU-tærskel. Bruges af `award_bid` til at vælge `standstill` vs. direkte `awarded`.

### Opfølgning

- [ ] Definér hvad "over_threshold" betyder konkret (CPV-kategori + estimeret værdi) — skal kunne overrides manuelt af buyer ved tvivl
- [ ] UI: tildelings-flow med explicit confirmation før RPC-kald
- [ ] Test: rollback-scenarie ved fejl i notification-oprettelse
- [ ] Test: `cancel_award` blokeres efter kontrakt-underskrift (kræver kontrakt-modul der ikke eksisterer endnu — markeres som fremtidig)
- [ ] Verificer at SESSION_NOTES.md-noterne om 18. maj-erstatninger er afspejlet korrekt her

---
## Sektion 8: Reference #8 — procurement notifications

### Status

Låst 26. maj 2026. Den længste og mest komplekse reference med 6 underspørgsmål (8.1-8.6).

### Konflikt-risiko

🔴 Høj. Etablerer fundament for juridisk kanal — fejl her kan have direkte regulatoriske konsekvenser (klagefrist beregnet forkert, standstill brudt, § 170-pligt forsømt).

Risikofaktorer:

- State-machine `draft → pending_send → sent` skal håndhæves konsistent
- Flere tabeller med indbyrdes afhængigheder — kræver disciplineret migration-rækkefølge inden for #10
- SMTP-integration (Resend) er ekstern dependency med egen fejl-mode
- JSONB-payload validering kritisk; en typo i payload-struktur kan blokere notifikation

### Kode-referencer

- Skal integreres med `award_bid`-RPC (#6) der opretter draft-notifications
- Resend SMTP-client (eksisterer; konfigureret til `onboarding@resend.dev`)
- Q&A-flow: skal generere notifikationer ved publicering af svar (jf. CLAUDE.md "horizon"-noter)

### Brugerhistorie

> Som ordregiver vil jeg sende underretninger til tilbudsgivere ved kritiske milepæle i udbudsprocessen — tildelingsbeslutning, standstill-meddelelse, afslag, annullering, rettelsesbekendtgørelse. Underretningerne skal være:
>
> - Juridisk sporbare (klagefrist starter ved levering, ikke ved klik)
> - Modtaget i platform-inbox (juridisk primær kanal) + trigger-email (notifikation)
> - State-tracked så jeg kan se hvilke der er sendt, hvilke er udkast, hvilke har fejlet
> - Genererbare via skabeloner (system + egne organisations-skabeloner) med AI-assist til konkret formulering
> - Med bilag der kan deles på tværs af modtagere (fx vinder-meddelelse i bcc) eller være individuelle (fx afslagsbrev med bid-specifik begrundelse)

### Designvalg

Designet er opdelt i 6 sub-beslutninger (8.1-8.6) som blev låst sekventielt i 26. maj-sessionen.

#### 8.1: Datamodel

**Mulighed valgt:** Én tabel `procurement_notifications` med typed JSONB payload, valideret via zod's `discriminatedUnion`.

Alternativet (separate tabeller pr. type) blev forkastet fordi:

- Notifikations-typer deler 90% af felterne (afsender, modtagere, status, audit)
- Discriminated union i zod giver type-sikkerhed på applikationsniveau uden tabel-eksplosion
- Lettere at tilføje nye typer uden migration

**Bemærkning:** `standstill_end` blev udeladt fra `notification_type`-enum. Standstill håndteres som fase (#4), ikke som notifikations-type. Den notifikation der **udløser** standstill er en `award_decision` der trigger-skaber `standstill`-fase atomisk.

#### 8.2: Modtager-model

**Mulighed valgt:** To-lags model — `notification_recipients` (hvem skal modtage) + `notification_deliveries` (hvilken kanal, status pr. leverance).

Platform-inbox er den **juridiske** kanal. Email er **trigger** med link til inbox. Dette afspejler udbudsrettens krav om dokumenterbar levering (BEK 1572).

Alternativet (kun email) blev forkastet:

- Email-bounces gør juridisk dokumentation usikker
- Inbox er kontrollabel kanal hvor levering kan timestampes pålideligt
- BEK 1572 kræver "platform tilgængelig for tilbudsgiver" — inbox opfylder dette eksplicit

#### 8.3: Samtidighed

**Mulighed valgt:** Atomic transaction-RPC `send_procurement_notification` + preview-confirm UX i UI.

State-machine:

```
draft ──→ pending_send ──→ sent
                              ├──→ (terminal: ingen rollback)
                              │
                              [hvis fejl] ──→ partially_failed eller failed
```

`draft → pending_send` sker når buyer klikker "send". `pending_send → sent` sker når RPC har:
1. Oprettet alle `notification_recipients`-rækker
2. Oprettet alle `notification_deliveries`-rækker (status='pending')
3. Triggeret SMTP-job (out-of-band, fire-and-forget; status opdateres async via webhook fra Resend)
4. Skabt eventuelle fase-overgange (#4)
5. Logget i audit-trail

Hvis SMTP fejler for nogle modtagere men ikke alle: `partially_failed`. Hvis alle fejler: `failed`. Inbox-leverance er aldrig fejlende (insert i db = leveret).

#### 8.4: Modtagelses-tracking

**Mulighed valgt:** Standard SMTP + inbox-view-tracking. Ingen tracking-pixel. Ingen tvungen anerkendelse.

Klagefrist forankret i `legal_received_at` på `notification_deliveries`:

- For platform-inbox: `legal_received_at = sent_at` (juridisk levering = insert-tid i inbox)
- For email: ikke juridisk anker; UI viser "også sendt via email" men frist beregnes fra inbox-leverance

Begrundelse for at undgå pixel: GDPR-tvivlsspørgsmål + signalværdi (advokater læser tracking-pixels som forsøg på at presse klagefrister; uprofessionelt).

Begrundelse for at undgå tvungen anerkendelse: bryder klage-mekanikken — tilbudsgiver kan udskyde "tryk for at anerkende" og senere påstå manglende levering.

#### 8.5: Standstill-håndtering

**Mulighed valgt:** Standstill som fase i `tender_phases` (jf. #4). Auto-opret for over-tærskel award med eksplicit fravælg-mulighed. Ingen § 170-standstill. 10 dages standstill ved elektronisk levering.

Hvorfor "eksplicit fravælg"?

- Standard er at standstill påkræves over EU-tærskel (udbudsloven § 3, jf. klagenævnsloven § 3)
- Men: visse procedurer (fx genudbud efter klagenævnsafgørelse) kan undtagelsesvis undgå standstill
- Buyer kan eksplicit fravælge, men skal angive grundlag (text-felt på `tender_phases.metadata`)

Hvorfor ingen § 170-standstill?

- § 170 vedrører unfair konkurrence-fortilfælde; ikke samme mekanisme som § 171-standstill
- Implementering ville være over-engineering for v1; tilføjes senere hvis kunde-behov opstår

Hvorfor 10 dage og ikke 15?

- Udbudsloven § 3, stk. 1: 10 kalenderdage ved elektronisk afsendelse
- 15 dage gælder ved postlevering, hvilket vi ikke understøtter

#### 8.6: Generering-flow

**Variant valgt:** Variant 3 — inline-body med compliance-validering + shared/individual attachments.

Andre overvejede varianter:

- Variant 1: ren skabelon-baseret (afvist: for stivt; AI-assist mangler)
- Variant 2: ren AI-fri-tekst (afvist: ingen compliance-garanti)
- **Variant 3 (valgt):** Skabelon som starting point + AI-assist til konkret formulering + compliance-validering (har den de obligatoriske felter? klagefrist-tekst? begrundelse?)

Skabelon-niveauer:

1. **System-skabeloner:** Stilles til rådighed af platformen, opdateres af os
2. **Custom org-skabeloner:** Hver ordregiver-organisation kan oprette egne (fx kommunens egen brevskabelon med logo)

Attachments:

- **Shared:** Samme bilag til alle modtagere (fx generel evalueringsrapport)
- **Individual:** Modtager-specifikke bilag (fx bid-specifik scoring til afslagsbrev)

### Beslutning

#### Tabel 1: `procurement_notifications`

```
procurement_notifications
├── id                  uuid PK
├── tender_id           uuid FK → tenders (NOT NULL)
├── type                notification_type NOT NULL
├── state               notification_state NOT NULL DEFAULT 'draft'
├── subject             text NOT NULL
├── body_inline         text                  -- selve brev-teksten (inline, ikke fil)
├── payload             jsonb NOT NULL        -- type-specifik struktureret data (zod-valideret)
├── template_id         uuid FK → notification_templates (nullable; hvis genereret fra skabelon)
├── parent_notification_id uuid FK → procurement_notifications  -- ved rettelses-/opfølgnings-meddelelser
├── related_lot_id      uuid FK → tender_lots (nullable)
├── related_bid_id      uuid FK → bids (nullable)
├── scheduled_send_at   timestamptz           -- til schedulering (fremtidig udvidelse)
├── sent_at             timestamptz           -- sat når state → 'sent'
├── failed_at           timestamptz           -- sat ved state → 'failed' eller 'partially_failed'
├── failure_summary     text
└── (standard audit-felter)
```

#### Tabel 2: `notification_recipients`

```
notification_recipients
├── id                       uuid PK
├── notification_id          uuid FK → procurement_notifications (NOT NULL, ON DELETE CASCADE)
├── supplier_organisation_id uuid FK → supplier_organisations (NOT NULL)
├── recipient_label          text     -- "Vinder", "Afgivet tilbud", "Trukket", etc. (kontekst)
└── (standard audit-felter)

uq_notification_recipients  UNIQUE (notification_id, supplier_organisation_id)
```

#### Tabel 3: `notification_deliveries`

```
notification_deliveries
├── id                           uuid PK
├── notification_recipient_id    uuid FK → notification_recipients (NOT NULL, ON DELETE CASCADE)
├── channel                      delivery_channel NOT NULL
├── target_address               text NOT NULL    -- inbox-id eller email-adresse
├── status                       delivery_status NOT NULL DEFAULT 'pending'
├── sent_at                      timestamptz      -- når Resend bekræfter / inbox insert sker
├── legal_received_at            timestamptz      -- juridisk leveringspunkt (KUN for inbox)
├── read_at                      timestamptz      -- inbox-view tidspunkt (KUN for inbox)
├── bounce_reason                text             -- ved bounce/failed
├── external_message_id          text             -- Resend's message-id til opfølgning
├── attempt_count                int DEFAULT 0
└── (standard audit-felter)
```

#### Tabel 4: `notification_templates`

```
notification_templates
├── id                  uuid PK
├── organisation_id     uuid FK → organisations (NULL for system-templates)
├── type                notification_type NOT NULL
├── name                text NOT NULL
├── subject_template    text NOT NULL    -- med {{variabel}}-placeholders
├── body_template       text NOT NULL    -- markdown
├── is_system           boolean DEFAULT false
├── is_active           boolean DEFAULT true
├── compliance_checks   jsonb NOT NULL DEFAULT '[]'  -- liste af checks der skal passere
└── (standard audit-felter)

uq_notification_templates_org  UNIQUE (organisation_id, type, name) WHERE organisation_id IS NOT NULL
```

#### Tabel 5: `notification_attachments`

```
notification_attachments
├── id                          uuid PK
├── notification_id             uuid FK → procurement_notifications (NOT NULL, ON DELETE CASCADE)
├── notification_recipient_id   uuid FK → notification_recipients  -- NULL = shared til alle
├── storage_path                text NOT NULL
├── filename                    text NOT NULL
├── mime_type                   text NOT NULL
├── size_bytes                  bigint NOT NULL
├── uploaded_by                 uuid FK → auth.users
└── (standard audit-felter)
```

Constraint: hvis `notification_recipient_id IS NULL` → bilaget er shared. Ellers individuelt.

#### Enums

```sql
CREATE TYPE notification_type AS ENUM (
  'award_decision',
  'standstill_notice',  
  'rejection',
  'cancellation',
  'correction',
  'general'
);

CREATE TYPE notification_state AS ENUM (
  'draft',
  'pending_send',
  'sent',
  'partially_failed',
  'failed',
  'cancelled_superseded'
);

CREATE TYPE delivery_channel AS ENUM (
  'platform_inbox',
  'email'
);

CREATE TYPE delivery_status AS ENUM (
  'pending',
  'sent',
  'bounced',
  'failed',
  'read_in_inbox'
);
```

#### RPC: `send_procurement_notification`

Pseudo-flow:

```
BEGIN

  Verify caller is buyer on tender.organisation_id (42501)
  Verify notification.state = 'draft' (22023)
  Verify payload passes zod-schema (22023 if not)
  Verify at least one recipient exists (22023)

  UPDATE notification SET state='pending_send'

  -- Opret deliveries
  FOR each recipient:
    INSERT delivery (channel='platform_inbox', status='sent', sent_at=now(), legal_received_at=now())
    IF recipient has notification-email opted in:
      INSERT delivery (channel='email', status='pending')
      -- Resend-call skedulers out-of-band

  -- Fase-overgang hvis relevant
  IF type = 'award_decision' AND lot.over_threshold:
    INSERT tender_phases (phase_type='standstill', ends_at_planned=now()+'10 days')
  
  UPDATE notification SET state='sent', sent_at=now()

  -- Audit
  INSERT audit_log entry

COMMIT
-- Post-commit: trigger SMTP-jobs (out-of-band; webhook fra Resend opdaterer delivery-status async)
```

#### Trigger

`trg_notifications_validate_state` BEFORE UPDATE: bloker ulovlige state-overgange (fx `sent → draft`).

#### Compliance-validering pr. type

`notification_templates.compliance_checks` indeholder JSONB-liste, fx:

```json
[
  {"check": "must_contain", "field": "body_inline", "value": "klagefrist", "case_insensitive": true},
  {"check": "must_have_attachment", "min_count": 1},
  {"check": "must_reference_lot"}
]
```

Køres ved `send_procurement_notification` før transit til `pending_send`. Fejler → tilbage til draft + fejlbesked til buyer.

### Opfølgning

- [ ] Zod-schemas for `procurement_notifications.payload` (discriminated union per type)
- [ ] Resend webhook-endpoint for delivery-status updates
- [ ] UI: notification-composer med template-vælger + AI-assist + preview
- [ ] UI: inbox for suppliers (platform-inbox-visning)
- [ ] Cron-job: standstill-fase-overgang fra `standstill → awarded` ved `ends_at_planned`-udløb
- [ ] DPA-status med Resend skal være verificeret før produktion (jf. CLAUDE.md compliance-noter)
- [ ] Test: full lifecycle award_decision → standstill → awarded med faktisk SMTP-leverance i preprod

---

## Sektion 9: Reference #9 — notices + sync_state (DKUDBUD lokal sync)

### Status

Låst 26. maj 2026 efter 6 underspørgsmål (9.1-9.6).

### Konflikt-risiko

🟡 Medium. Selvstændig domæne med få afhængigheder til andre tabeller. Hovedrisiko er sync-cron-stabilitet og ERST API-rate-limits.

Risikofaktorer:

- Vercel Pro-upgrade prerequisite (cron 30 min frekvens)
- ERST API-rate-limits ikke fuldt afklaret (mail sendt 26. maj — afventer svar)
- tsvector + GIN performance på dansk skal verificeres med real-volume data
- Forhold til TED-publicering (mulig duplikering hvis udbud.dk forwarder over-tærskel) — afklaring afventer ERST-svar

### Kode-referencer

- `src/lib/search/providers/udbuddk.ts` — eksisterende mock skal erstattes
- Ny cron-route (`src/app/api/cron/sync-dkudbud/route.ts` — skrives som del af migration)
- Søge-UI komponenter

### Brugerhistorie

> Som ordregiver eller tilbudsgiver vil jeg kunne søge i danske udbudsbekendtgørelser direkte på platformen — både dem vi selv har publiceret og dem hentet fra DKUDBUD. Søgning skal være hurtig (<1s) og understøtte dansk sprog (æøå, stammeordsmatching, fuldtekst).

### Designvalg

#### 9.1: Scope

**Valgt:** DKUDBUD + eget-publicerede, forenet til én `notices`-tabel. TED udskudt til v2.

Begrundelse:

- DKUDBUD forwarder over-tærskel notices til TED, så hvis vi henter fra TED for "fuldstændighed" risikerer vi duplikering
- v1 fokus er DK-markedet
- Forening i én tabel giver én søge-overflade for brugeren

#### 9.2: Sync-strategi

**Valgt:** Pull-cron only i v1. Webhook forward-compatible (skema rummer felter til at acceptere push), men ikke aktiveret.

Begrundelse: webhook fra ERST ikke verificeret eksisterende. Pull er kontrollérbar og rate-limit-håndterbar.

#### 9.3: Frekvens

**Valgt:** 30 min default, justerbar via env-var. Strategi B1 (fuld refresh) i opstart, migrér til B3 (hybrid inkrementel + nattlig fuld backstop) når ERST bekræfter `from`-parameter på `fraKilde`-endpoint.

Soft-delete: notices der forsvinder fra DKUDBUD markeres `status='cancelled'` (ikke slettet). Nattlig backstop opdager forsvundne notices.

#### 9.4: Retention

**Valgt:** Ingen retention-grænse. Begrundelse:

- Volumen er overskuelig (DK genererer ~10.000 notices/år)
- Historiske notices har værdi for konkurrentanalyse, CPV-trend-analyse, prækvalifikation-research
- Compliance: arkivloven gør permanent opbevaring naturlig

#### 9.5: Indekserings-strategi

**Valgt:** PostgreSQL `tsvector` + `GIN`-index med `danish`-config. `pg_trgm` (similarity search for typos) udskudt til v2.

Begrundelse:

- `tsvector` er Postgres-native, ingen ekstern søgemaskine (Elasticsearch overkill)
- `danish`-config håndterer æøå og dansk stemming
- v1 søger primært på CPV + titel + organisations-navn; fuldtekst er bonus

#### 9.6: Forenet vs. separat

**Valgt:** `notices` er **denormaliseret søge-indeks**. `tenders` forbliver sandhedskilde for eget-publicerede.

Konsekvens:

- Eget-publicerede skrives til `notices` via trigger fra `publication_events` når status går til `published`
- Søgning sker altid mod `notices`
- Detail-view af eget tender åbner i tender-detail-side (ikke notice-side)
- Detail-view af DKUDBUD-notice åbner i read-only notice-side med link til kilde

### Beslutning

#### Tabel 1: `notices`

```
notices
├── id                       uuid PK
├── source                   text NOT NULL         -- 'DKUDBUD', 'OWN', 'TED' (TED reserveret til v2)
├── external_id              text                  -- DKUDBUD notice-id; NULL for OWN
├── external_version         text                  -- notice-version fra DKUDBUD
├── tender_id                uuid FK → tenders     -- NULL for DKUDBUD; sat for OWN
├── status                   notice_status NOT NULL DEFAULT 'active'
├── 
├── title                    text NOT NULL
├── organisation_name        text NOT NULL         -- denormaliseret
├── organisation_id_external text                  -- CVR for DK-ordregiver
├── cpv_main                 text                  -- primær CPV-kode
├── cpv_additional           text[]                -- yderligere CPV-koder
├── nuts_codes               text[]                -- geografi
├── procedure_type           text                  -- 'open', 'restricted', etc.
├── contract_type            text                  -- 'services', 'supplies', 'works'
├── estimated_value          numeric(14,2)
├── estimated_value_currency char(3) DEFAULT 'DKK'
├── 
├── published_at             timestamptz NOT NULL
├── deadline_submission      timestamptz
├── deadline_questions       timestamptz
├── 
├── raw_xml                  text                  -- original eForms XML (DKUDBUD) eller egen XML (OWN)
├── raw_metadata             jsonb                 -- struktureret ekstrakt fra XML
├── source_url               text                  -- link til kilde (DKUDBUD.dk eller egen tender-side)
├── 
├── search_vector            tsvector              -- generated column eller maintained via trigger
├── 
├── synced_at                timestamptz NOT NULL DEFAULT now()
├── source_last_modified     timestamptz
└── (standard audit-felter)

uq_notices_source_external  UNIQUE (source, external_id) WHERE external_id IS NOT NULL
uq_notices_tender_id        UNIQUE (tender_id) WHERE tender_id IS NOT NULL
```

#### Tabel 2: `sync_state`

```
sync_state
├── id                       uuid PK
├── source                   text NOT NULL UNIQUE   -- 'DKUDBUD'
├── last_sync_started_at     timestamptz
├── last_sync_completed_at   timestamptz
├── last_sync_status         text                   -- 'success', 'partial', 'failed'
├── notices_processed        int DEFAULT 0
├── notices_inserted         int DEFAULT 0
├── notices_updated          int DEFAULT 0
├── notices_marked_cancelled int DEFAULT 0
├── last_error               text
├── consecutive_error_count  int DEFAULT 0
├── strategy                 text NOT NULL DEFAULT 'B1'  -- 'B1' (full refresh), 'B3' (hybrid)
├── from_cursor              timestamptz                 -- til B3 inkrementel
├── next_full_refresh_at     timestamptz                 -- B3-backstop scheduling
└── (standard audit-felter)
```

#### Enum

```sql
CREATE TYPE notice_status AS ENUM (
  'active',
  'corrected',
  'cancelled',
  'archived'
);
```

#### Indexes

```
idx_notices_source                    ON (source)
idx_notices_status                    ON (status) WHERE status = 'active'
idx_notices_published_at              ON (published_at DESC)
idx_notices_deadline_submission       ON (deadline_submission) WHERE status = 'active' AND deadline_submission IS NOT NULL
idx_notices_cpv_main                  ON (cpv_main)
idx_notices_cpv_additional_gin        ON cpv_additional USING GIN
idx_notices_nuts_codes_gin            ON nuts_codes USING GIN
idx_notices_organisation_id_external  ON (organisation_id_external)
idx_notices_search_vector_gin         ON search_vector USING GIN
```

#### tsvector-generering

Via generated column (PostgreSQL 12+):

```sql
search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('danish', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('danish', coalesce(organisation_name, '')), 'B') ||
  setweight(to_tsvector('danish', coalesce(cpv_main, '')), 'C') ||
  setweight(to_tsvector('danish', array_to_string(coalesce(cpv_additional, '{}'), ' ')), 'C')
) STORED
```

#### Cron-flow

```
1. Cron rammer /api/cron/sync-dkudbud (Vercel Pro)
2. Læs sync_state for 'DKUDBUD'
3. Bestem strategy (B1 eller B3)
4. Kald ERST fraKilde/DKUDBUD endpoint
   - B1: ingen from-parameter, hent alt
   - B3: from = sync_state.from_cursor
5. For hver notice i response:
   - UPSERT i notices (matched på (source, external_id))
   - Opdater search_vector via trigger (eller automatisk via generated column)
6. Hvis B3: nattlig backstop sammenligner local set vs. fuldt sæt; markerer fraværende som 'cancelled'
7. Opdater sync_state med metrics
```

#### Trigger for OWN-notices

`trg_publication_events_upsert_notice` på `publication_events` AFTER INSERT: hvis `event_type='publish_response'` og `http_status` i (200, 201, 202), upsert i `notices` med `source='OWN'` og data fra tender + payload.

#### RLS

`notices` er offentlige (alle published notices skal kunne findes via søgning, også af ikke-loggede brugere i lange løb). Foreløbig **læseadgang for alle** (incl. anon), skriveadgang kun via service-key fra cron-job.

⚠️ Bemærk: dette er én af de få tilladte `TO public`-policies (jf. §1.2). Eksplicit dokumenteret som ønsket adfærd.

### Opfølgning

- [ ] Verificer Vercel Pro-upgrade gennemført før cron aktiveres
- [ ] Afvent ERST-svar om `from`-parameter (mail sendt 26. maj) før migration fra B1 til B3
- [ ] Afvent ERST-svar om TED-forwarding for at afgøre om TED-integration giver mening senere
- [ ] tsvector performance-test med 10.000+ syntetiske notices
- [ ] UI: søge-komponent med filtre (CPV, NUTS, deadline, source)
- [ ] Cron-error-alerting: hvis `consecutive_error_count > 3`, send Sentry-alert
- [ ] Beslutning om `notices`-data skal indeholde fuld `raw_xml` (stor) eller kun parsed-metadata + link til kilde — pending volumen-vurdering

---

## Sektion 10: Afhængighedsgraf

Visualisering af inter-reference dependencies. Pile peger fra "afhænger af" til "afhænges af".

```
                            ┌────────────────┐
                            │   #1 leads     │  (selvstændig — slet)
                            │   DROP         │
                            └────────────────┘

  ┌─────────────────┐        ┌─────────────────┐
  │  #5 supplier-   │        │  #4 tender-     │
  │  organisations  │        │  phases         │
  │  (+ users +     │        │                 │
  │   participants) │        └─────────────────┘
  └────────┬────────┘                 │
           │                          │
           │                          ▼
           │                ┌─────────────────┐
           │                │  #6 awarded_    │
           │                │  bid_id +       │
           │                │  award_bid-RPC  │
           │                └────────┬────────┘
           │                         │
           ▼                         │
  ┌─────────────────┐                │
  │  bids-refactor  │◄───────────────┘
  │  (#5 finale)    │
  └────────┬────────┘
           │
           ▼
  ┌────────────────────────────────────┐
  │  #8 procurement_notifications      │
  │  (5 tabeller + RPC + triggers)     │
  └──────────────┬─────────────────────┘
                 │
                 │ (#8 forbruger fase-overgange fra #4)
                 │ (#8 forbruger supplier_organisations fra #5)
                 │
  ┌──────────────┴─────────────────────┐
  │  #3 evaluation_documents           │  (delvis — kan deploye uafhængigt)
  └────────────────────────────────────┘

  ┌────────────────────────────────────┐
  │  #2 publication_events             │  (selvstændig — kan parallel)
  │  + tenders.publication_status      │     med #3, #4, #5 før refactor
  └──────────────┬─────────────────────┘
                 │
                 │ (trigger fra #2 → #9 OWN-notices)
                 ▼
  ┌────────────────────────────────────┐
  │  #9 notices + sync_state           │  (selvstændig domæne; modtager
  │  + tsvector + GIN                  │   trigger-input fra #2)
  └────────────────────────────────────┘
```

#### Kritisk sti

Den lange kæde er: **#5 (supplier-org base) → #5 (bids-refactor) → #6 (award_bid) → #8 (notifications)**. Hvis backfill i #5 fejler, blokerer hele kæden. Derfor er PITR restore-test prerequisite.

Sideløb-spor: #2, #3, #4, #9 kan deployes parallelt og uafhængigt af hovedsporet — så vi ikke har alle æg i én kurv.

#### Migration-rækkefølge (gentaget fra §1.4 for læsbarhed)

```
#1 → #2 (parallelt med #3, #4)
#5 base → #5 participants → #5 bids-refactor
#5 bids-refactor → #6 (kræver ny supplier_organisation_id)
#4 (parallelt) → #6 (kræver phase-overgang)
#9 (selvstændig)
#10/#8 (kræver #5 + #4 + #6 være på plads)
```

---

## Sektion 11: Åbne punkter / afventer

Punkter der **ikke** er låst i dette dokument og som kræver opfølgning før eller under migrations-fasen.

### Afventer ekstern afklaring

| Punkt | Kilde | Estimeret deadline |
|-------|-------|---------------------|
| `from`-parameter på ERST `fraKilde`-endpoint (B3-strategi) | ERST mail 26. maj | Før migration fra B1 til B3; ikke blocker for v1 |
| ERST rate-limits og anbefalede sync-frekvenser | ERST mail 26. maj | Før PROD-aktivering af cron |
| TED-forwarding fra DKUDBUD (over-tærskel duplikering) | ERST mail 26. maj | Før v2-overvejelse om TED-integration |
| Webhook/push-mekanisme fra ERST | ERST mail 26. maj | v2 |
| Notice-status livscyklus (rettelser, annulleringer fra ERST-side) | ERST mail 26. maj | Før #9 deploy mod PROD |
| CPV-kode-struktur (flad vs. hierarkisk) | ERST mail 26. maj | Før søgnings-UI færdiggøres |
| PROD-ibrugtagning prerequisites | ERST mail 26. maj | Før første reelle PROD-publicering |

### Afventer intern beslutning

| Punkt | Reference | Estimeret deadline |
|-------|-----------|---------------------|
| Konkret "over_threshold"-definition (CPV + estimeret værdi) | #6 | Før #6 RPC implementeres |
| Hvordan håndteres legacy_personal supplier-orgs på sigt (konsolideringsstrategi) | #5 | Post-migration; ikke blocker |
| Storage-bucket-policy for `evaluation_documents` (signed URLs vs. direkte) | #3 | Før upload-UI bygges |
| Skal `notices.raw_xml` lagres fuldt eller kun ved request? | #9 | Pending volumen-vurdering |
| pg_cron vs. Vercel cron (langtidsbeslutning) | #9 | v2 — Vercel cron er låst for v1 |
| Compliance-checks JSONB-format for notification_templates | #8.6 | Før første skabelon oprettes |
| `tender_phases`-state-machine diagram skal i `docs/STATE-MACHINES.md` | #4 | Sammen med #4 migration |

### Afventer compliance-arbejde (menneske-domæne)

| Punkt | Reference | Estimeret deadline |
|-------|-----------|---------------------|
| DPA med Anthropic | AI-flow | Før pilot-onboarding |
| DPA med OpenAI | AI-flow | Før pilot-onboarding |
| DPA med Resend | #8 | Før første reelle SMTP-send mod kunder |
| Privatlivspolitik (juridisk indhold) | Hele platformen | Før pilot-onboarding |
| Vilkår | Hele platformen | Før pilot-onboarding |
| Tilgængelighedserklæring (WCAG 2.1 AA) | Hele platformen | Før pilot-onboarding |
| ZDR aktivering verificeret hos Anthropic | AI-flow | Før AI-flow aktiveres for kunder |

---

## Sektion 12: Revisions-historik

| Version | Dato | Ændringer | Forfatter |
|---------|------|-----------|-----------|
| 1.0 | 26. maj 2026 | Initial. Alle 14 designbeslutninger fra Rute C 20. + 26. maj. Cross-cutting + 8 references + afhængighedsgraf + åbne punkter. | Frederik + Claude (Claude.ai-hovedchat) |

### Note om forsinket disk-leverance

Dokumentet blev låst i chat 26. maj 2026, men kom først på disk 27. maj 2026 efter at Claude Code's Write-tool reproducerede duplikat-fejl i tre forsøg (26. maj) og igen ved SESSION_NOTES.md-opdatering (27. maj). Diagnose bekræftet: fejlen ligger i Claude Code's text-generation-buffer, ikke i disk-skrivnings-laget. PowerShell `[System.IO.File]::WriteAllText`-workaround virker ikke. Verificeret workaround: manuel copy-paste fra Claude.ai-hovedchat til VS Code. Detaljer i SESSION_NOTES.md (27. maj).

Versionen er ikke retroaktivt opdateret med 27. maj-information undtagen denne note; dokumentets indhold afspejler beslutningerne som de blev låst 26. maj.

---

**Slut på SCHEMA-DESIGN.md v1.0**