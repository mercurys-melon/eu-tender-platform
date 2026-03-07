# Tender Lifecycle Implementation

## Oversigt
Dette dokument beskriver implementeringen af tender lifecycle flow for både buyer og supplier perspektiver.

---

## 1. Database Schema

### Migration: `supabase/migrations/004_tender_lifecycle.sql`

**Ændringer:**

1. **Opdateret `tender_status` enum:**
   - Før: `'draft' | 'published' | 'closed' | 'awarded'`
   - Efter: `'draft' | 'published' | 'prequalification' | 'bidding' | 'evaluation' | 'awarded' | 'closed' | 'cancelled'`

2. **Ny tabel: `tender_participants`**
   - Tracks supplier participation i hvert tender
   - Felter:
     - `id` (UUID, primary key)
     - `tender_id` (UUID, foreign key til tenders)
     - `supplier_id` (UUID, foreign key til suppliers)
     - `supplier_status` (enum: supplier_tender_status)
     - `created_at`, `updated_at`

3. **Ny enum: `supplier_tender_status`**
   - `'interest_submitted' | 'prequalified' | 'proposal_in_progress' | 'proposal_submitted' | 'under_evaluation' | 'awarded' | 'not_awarded'`

4. **Nye felter på `tenders`:**
   - `prequalification_deadline` (TIMESTAMP WITH TIME ZONE, nullable)
   - `questions_deadline` (TIMESTAMP WITH TIME ZONE, nullable)

**RLS Policies:**
- Suppliers kan se deres egen deltagelse
- Tender owners kan se alle deltagere for deres tenders
- Suppliers kan oprette deres egen deltagelse
- Tender owners kan opdatere deltager-status

---

## 2. TypeScript Types

### Fil: `src/lib/tenders/types.ts`

**Typer:**
- `TenderStatus` - Buyer perspektiv
- `SupplierTenderStatus` - Supplier perspektiv
- `Tender` - Tender interface
- `TenderParticipant` - Participant interface
- `TenderWithStats` - Tender med statistik

### Fil: `src/lib/supabase/types.ts`

**Opdateret:**
- `tenders` table types med nye statuser
- `tender_participants` table types tilføjet

---

## 3. Lifecycle Helper Functions

### Fil: `src/lib/tenders/lifecycle.ts`

**Funktioner:**

1. **`canTransitionTenderStatus(from, to)`**
   - Validerer om en tender status transition er tilladt
   - Returnerer boolean

2. **`getNextTenderStatuses(current)`**
   - Returnerer array af mulige næste statuser

3. **`canTransitionSupplierStatus(from, to)`**
   - Validerer om en supplier status transition er tilladt

4. **`getNextSupplierStatuses(current)`**
   - Returnerer array af mulige næste statuser

5. **`isTenderStatusActive(status)`**
   - Tjekker om status er aktiv (ikke terminal)

6. **`canSupplierParticipate(status)`**
   - Tjekker om supplier kan deltage i tender

7. **`canSupplierBid(status)`**
   - Tjekker om supplier kan afgive tilbud

8. **`getTenderStatusGroup(status)`**
   - Grupperer tender status i: 'active' | 'awarded' | 'completed'

9. **`getSupplierStatusGroup(status)`**
   - Grupperer supplier status i: 'discoverable' | 'active' | 'result'

**Brug i UI:**
- Validering før status-ændringer
- Bestemmelse af hvilke knapper der skal vises
- Gruppering i dashboards

---

## 4. Status Badge Components

### Fil: `src/components/tenders/TenderStatusBadge.tsx`

**Komponent:**
- Viser tender status med dansk label
- Farvekodet badge baseret på status
- Props: `status: TenderStatus`, `className?: string`

**Status labels:**
- `draft` → "Udkast"
- `published` → "Offentliggjort"
- `prequalification` → "Prækvalifikation"
- `bidding` → "Tilbudsfrist"
- `evaluation` → "Evalueres"
- `awarded` → "Tildelt"
- `closed` → "Afsluttet"
- `cancelled` → "Annulleret"

### Fil: `src/components/tenders/SupplierStatusBadge.tsx`

**Komponent:**
- Viser supplier status med dansk label
- Farvekodet badge baseret på status
- Props: `status: SupplierTenderStatus`, `className?: string`

**Status labels:**
- `interest_submitted` → "Ansøgning sendt"
- `prequalified` → "Prækvalificeret"
- `proposal_in_progress` → "Tilbudskladde"
- `proposal_submitted` → "Tilbud indsendt"
- `under_evaluation` → "Under evaluering"
- `awarded` → "Tildelt"
- `not_awarded` → "Ikke tildelt"

---

## 5. Buyer Dashboard

### Fil: `src/app/buyer/page.tsx`

**Opdateringer:**

1. **Data-hentning:**
   - Henter tenders med nye statuser
   - Henter participant counts
   - Henter prequalification_deadline og questions_deadline

2. **Gruppering:**
   - "Udbud i forberedelse" - status: `draft`
   - "Udbud aktivt" - status: `published`, `prequalification`, `bidding`, `evaluation`
   - "Tildelte udbud" - status: `awarded`
   - "Afsluttede og annullerede udbud" - status: `closed`, `cancelled`

3. **UI:**
   - Bruger `TenderStatusBadge` komponent
   - Viser deadlines (submission, prequalification, questions)
   - Viser participant counts

**Data-hentning:**
- Server component (Next.js 14)
- Bruger Supabase SSR client
- Parallel data-hentning med `Promise.all()`

---

## 6. Supplier Dashboard

### Fil: `src/app/supplier/page.tsx`

**Opdateringer:**

1. **Data-hentning:**
   - Henter åbne udbud (published eller bidding)
   - Henter supplier's participations fra `tender_participants`
   - Joiner med tenders for at få tender details

2. **Gruppering:**
   - "Åbne udbud du kan byde på" - discoverable tenders
   - "Dine aktive tilbud" - participations med active status
   - "Resultater" - participations med result status

3. **UI:**
   - Bruger både `TenderStatusBadge` og `SupplierStatusBadge`
   - Viser knapper baseret på status ("Anmod om deltagelse", "Afgiv tilbud")
   - Filtrerer discoverable tenders (ingen participation eller prequalified)

**Data-hentning:**
- Server component (Next.js 14)
- Bruger Supabase SSR client
- Parallel data-hentning med `Promise.all()`
- Filtrerer på `supplier_id` for participations

---

## 7. Status Transitions

### Tender Status Flow (Buyer)

```
draft → published → prequalification → bidding → evaluation → awarded → closed
  ↓         ↓              ↓              ↓            ↓
cancelled cancelled   cancelled      cancelled   cancelled
```

**Gyldige transitions:**
- `draft` → `published`, `cancelled`
- `published` → `prequalification`, `bidding`, `cancelled`
- `prequalification` → `bidding`, `cancelled`
- `bidding` → `evaluation`, `cancelled`
- `evaluation` → `awarded`, `cancelled`
- `awarded` → `closed`
- `closed` → (terminal)
- `cancelled` → (terminal)

### Supplier Status Flow

```
interest_submitted → prequalified → proposal_in_progress → proposal_submitted → under_evaluation → awarded
                          ↓                ↓                      ↓                    ↓
                    not_awarded      not_awarded            not_awarded        not_awarded
```

**Gyldige transitions:**
- `interest_submitted` → `prequalified`, `not_awarded` (buyer)
- `prequalified` → `proposal_in_progress`, `not_awarded` (supplier/buyer)
- `proposal_in_progress` → `proposal_submitted`, `not_awarded` (supplier/buyer)
- `proposal_submitted` → `under_evaluation`, `not_awarded` (buyer)
- `under_evaluation` → `awarded`, `not_awarded` (buyer)
- `awarded` → (terminal)
- `not_awarded` → (terminal)

---

## 8. Testplan

### Fil: `TEST_PLAN_ROLE_BASED_ACCESS.md`

**Tilføjet:**
- Sektion 11: Tender Lifecycle Flow
- 12 testscenarier der dækker hele lifecycle
- Testcases for status-transitions
- Testcases for UI-komponenter
- Testcases for dashboard-gruppering

---

## 9. Brug af Lifecycle Helpers i UI

### Eksempel: Tender Details Side

```typescript
import { canTransitionTenderStatus, getNextTenderStatuses } from '@/lib/tenders/lifecycle'

// I en component
const currentStatus: TenderStatus = 'published'
const nextStatuses = getNextTenderStatuses(currentStatus)
// Returns: ['prequalification', 'bidding', 'cancelled']

// Vis knapper baseret på mulige transitions
{nextStatuses.map(status => (
  <button
    key={status}
    onClick={() => handleStatusChange(status)}
    disabled={!canTransitionTenderStatus(currentStatus, status)}
  >
    {getStatusLabel(status)}
  </button>
))}
```

### Eksempel: Supplier Participation

```typescript
import { canSupplierBid, canSupplierParticipate } from '@/lib/tenders/lifecycle'

// Tjek om supplier kan deltage
if (canSupplierParticipate(tender.status)) {
  // Vis "Anmod om deltagelse" knap
}

// Tjek om supplier kan afgive tilbud
if (canSupplierBid(tender.status) && participant?.supplier_status === 'prequalified') {
  // Vis "Afgiv tilbud" knap
}
```

---

## 10. Vigtige pointer

### ✅ Data-sikkerhed
- RLS policies sikrer at suppliers kun ser deres egen deltagelse
- Tender owners kan se alle deltagere for deres tenders
- Status-transitions valideres både i UI og (skal valideres) i API

### ✅ Performance
- Parallel data-hentning i dashboards
- Efficiente queries med joins
- Indexes på status-felter

### ✅ Kode-kvalitet
- Centraliseret lifecycle-logik
- Type-safe status transitions
- Genbrugelige badge-komponenter

### ✅ Skalerbarhed
- Lifecycle kan udvides med flere faser
- Status-transitions kan tilpasses
- Nye statuser kan tilføjes til enums

---

## 11. Næste skridt

1. **Implementer API endpoints** for status-ændringer
2. **Tilføj validering** i API for status-transitions
3. **Tilføj notifikationer** ved status-ændringer
4. **Implementer UI** for status-ændringer (knapper, modals)
5. **Tilføj audit log** for status-ændringer
6. **Tilføj deadlines** management (prequalification, questions)

---

## 12. Filoversigt

### Nye filer
- `supabase/migrations/004_tender_lifecycle.sql` - Database migration
- `src/lib/tenders/types.ts` - TypeScript types
- `src/lib/tenders/lifecycle.ts` - Lifecycle helper functions
- `src/components/tenders/TenderStatusBadge.tsx` - Tender status badge
- `src/components/tenders/SupplierStatusBadge.tsx` - Supplier status badge
- `TENDER_LIFECYCLE_IMPLEMENTATION.md` - Denne dokumentation

### Opdaterede filer
- `src/lib/supabase/types.ts` - Opdateret med nye statuser og tender_participants
- `src/app/buyer/page.tsx` - Opdateret med lifecycle-gruppering
- `src/app/supplier/page.tsx` - Opdateret med lifecycle-gruppering
- `TEST_PLAN_ROLE_BASED_ACCESS.md` - Tilføjet lifecycle testscenarier

