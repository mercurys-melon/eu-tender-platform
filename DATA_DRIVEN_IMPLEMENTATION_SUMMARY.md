# Sammenfatning: Data-driven dashboards og centraliseret auth

## Oversigt
Denne dokumentation beskriver implementeringen af data-driven dashboards for både buyer og supplier, samt centralisering af rolle- og session-håndtering.

---

## 1. Centraliseret Auth Helper

### Fil: `src/lib/auth/session.ts`

**Formål:** Centraliseret håndtering af session og rolle for at undgå duplikeret logik.

**Funktioner:**

1. **`getSessionAndRole()`** - Til server components og API routes
   - Bruger Supabase SSR client med cookies
   - Henter session og rolle fra profiles-tabellen
   - Returnerer `SessionData` med session, role og userId

2. **`getSessionAndRoleForMiddleware(req)`** - Til middleware
   - Bruger Supabase SSR client med request cookies
   - Henter session og rolle fra profiles-tabellen
   - Returnerer `SessionData`

3. **`requireAuth()`** - Kræver autentificering
   - Kaster fejl hvis ikke autentificeret
   - Brug i server components der kræver login

4. **`requireRole(requiredRole)`** - Kræver specifik rolle
   - Kaster fejl hvis ikke autentificeret eller forkert rolle
   - Brug i server components der kræver specifik rolle

**Brug:**
```typescript
// I server component
const { userId, role } = await requireRole('buyer')

// I middleware
const { session, role } = await getSessionAndRoleForMiddleware(req)
```

---

## 2. Buyer Dashboard - Data-driven

### Fil: `src/app/buyer/page.tsx`

**Ændringer:**
- Konverteret fra client component til server component
- Erstattet mock data med rigtige Supabase queries
- Tilføjet data-hentning funktioner

**Data-hentning:**

1. **`getBuyerTenders(userId)`**
   - Henter tenders hvor `entity_id = userId`
   - Tæller bids per tender
   - Returnerer tenders med bid counts

2. **`getUpcomingDeadlines(userId)`**
   - Henter tenders hvor `entity_id = userId`
   - Filtrerer på deadlines i næste 30 dage
   - Returnerer deadlines sorteret efter dato

3. **`getRecentActivity(userId)`**
   - Henter spørgsmål fra buyer's tenders
   - Henter nye bids til buyer's tenders
   - Returnerer sorteret aktivitet

4. **`getTenderStats(userId)`**
   - Tæller aktive udbud (published, sidste 12 mdr.)
   - Tæller udbud i forberedelse (draft)
   - Tæller afsluttede udbud (closed/awarded, sidste 12 mdr.)

**Sikkerhed:**
- Alle queries filtrerer på `entity_id = userId`
- Buyer ser kun sine egne udbud
- Ingen data leakage til andre buyers

**Tabeller brugt:**
- `tenders` - buyer's udbud
- `bids` - tilbud modtaget til buyer's udbud
- `tender_questions` - spørgsmål om buyer's udbud

---

## 3. Supplier Dashboard - Data-driven

### Fil: `src/app/supplier/page.tsx`

**Ændringer:**
- Konverteret fra client component til server component
- Erstattet mock data med rigtige Supabase queries
- Tilføjet data-hentning funktioner

**Data-hentning:**

1. **`getSupplierId(userId)`**
   - Finder supplier record baseret på `user_id`
   - Returnerer supplier ID eller null

2. **`getOpenTenders()`**
   - Henter published tenders med fremtidig deadline
   - Viser alle åbne udbud (ikke buyer-specific)
   - Returnerer sorteret efter deadline

3. **`getMyBids(supplierId)`**
   - Henter bids hvor `supplier_id = supplierId`
   - Joiner med tenders for at få tender title
   - Returnerer supplier's tilbud

4. **`getNotifications(userId)`**
   - Henter notifikationer hvor `user_id = userId`
   - Returnerer sorteret efter dato

5. **`getRecentActivity(supplierId, userId)`**
   - Henter supplier's bids
   - Henter supplier's notifikationer
   - Henter svar på spørgsmål for udbud hvor supplier har tilbud
   - Returnerer sorteret aktivitet

**Sikkerhed:**
- Alle queries filtrerer på `supplier_id` eller `user_id`
- Supplier ser kun sine egne tilbud og notifikationer
- Ingen data leakage til andre suppliers

**Tabeller brugt:**
- `suppliers` - supplier profil
- `tenders` - åbne udbud
- `bids` - supplier's tilbud
- `notifications` - supplier's notifikationer
- `tender_questions` - spørgsmål og svar

---

## 4. Middleware Opdatering

### Fil: `src/middleware.ts`

**Ændringer:**
- Bruger nu `getSessionAndRoleForMiddleware` fra centraliseret helper
- Fjernet duplikeret session/role-hentning
- Koden er nu kortere og mere vedligeholdelig

**Før:**
- Direkte Supabase client oprettelse i middleware
- Duplikeret session/role-hentning
- ~100 linjer kode

**Efter:**
- Bruger centraliseret helper
- Konsistent med server components
- ~60 linjer kode

---

## 5. Testplan Opdatering

### Fil: `TEST_PLAN_ROLE_BASED_ACCESS.md`

**Tilføjede testcases:**

1. **Buyer Dashboard (Data-driven)** - Sektion 6
   - Testcases for data-integritet
   - Testcases for data-sikkerhed
   - Verificerer at buyer kun ser sine egne data

2. **Supplier Dashboard (Data-driven)** - Sektion 7
   - Testcases for data-integritet
   - Testcases for data-sikkerhed
   - Verificerer at supplier kun ser sine egne data

3. **Centraliseret Auth Helper** - Sektion 9
   - Testcases for konsistent brug af helper
   - Testcases for ingen duplikeret logik

**Opdaterede acceptkriterier:**
- Tilføjet data-integritet krav
- Tilføjet data-sikkerhed krav
- Tilføjet kode-kvalitet krav

---

## Vigtige pointer

### ✅ Data-sikkerhed

- **Buyer:** Alle queries filtrerer på `entity_id = userId`
- **Supplier:** Alle queries filtrerer på `supplier_id` eller `user_id`
- **Ingen cross-role access:** Buyer ser ikke supplier data og omvendt
- **Ingen hardcoded IDs:** Alt baseret på aktuel bruger

### ✅ Performance

- **Parallel data-hentning:** `Promise.all()` bruges til at hente data parallelt
- **Begrænsede queries:** `limit()` bruges til at begrænse resultater
- **Efficiente joins:** Joins bruges kun hvor nødvendigt

### ✅ Kode-kvalitet

- **Centraliseret auth:** En helper til alle session/role-hentning
- **Server components:** Bedre performance og SEO
- **Type safety:** TypeScript types for alle data
- **Error handling:** Graceful håndtering af manglende data

### ✅ Brugeroplevelse

- **Loading states:** Viser "Ingen data" når relevant
- **Empty states:** Giver brugeren vejledning (fx "Opret dit første udbud")
- **Konsistent UI:** Samme stil som før, men med rigtige data

---

## Næste skridt

1. **Test alle scenarier** fra opdateret testplan
2. **Tilføj loading states** hvis nødvendigt (server components loader automatisk)
3. **Tilføj error boundaries** for bedre fejlhåndtering
4. **Overvej caching** for ofte-hentede data
5. **Tilføj pagination** hvis der er mange resultater

---

## Filoversigt

### Nye filer
- `src/lib/auth/session.ts` - Centraliseret auth helper

### Opdaterede filer
- `src/app/buyer/page.tsx` - Data-driven buyer dashboard
- `src/app/supplier/page.tsx` - Data-driven supplier dashboard
- `src/middleware.ts` - Bruger centraliseret auth helper
- `TEST_PLAN_ROLE_BASED_ACCESS.md` - Opdateret med data-driven tests

### Uændrede filer
- `src/app/(auth)/login/page.tsx` - Fungerer som før
- `src/app/(auth)/register/page.tsx` - Fungerer som før
- `src/components/layout/nav-bar.tsx` - Fungerer som før

---

## Tekniske detaljer

### Database queries

**Buyer dashboard:**
```sql
-- Hent buyer's tenders
SELECT * FROM tenders WHERE entity_id = :userId

-- Tæl bids per tender
SELECT tender_id, COUNT(*) FROM bids WHERE tender_id IN (:tenderIds) GROUP BY tender_id

-- Hent deadlines
SELECT * FROM tenders WHERE entity_id = :userId AND submission_deadline BETWEEN NOW() AND NOW() + 30 DAYS
```

**Supplier dashboard:**
```sql
-- Hent supplier ID
SELECT id FROM suppliers WHERE user_id = :userId

-- Hent åbne udbud
SELECT * FROM tenders WHERE status = 'published' AND submission_deadline > NOW()

-- Hent supplier's bids
SELECT b.*, t.title FROM bids b INNER JOIN tenders t ON b.tender_id = t.id WHERE b.supplier_id = :supplierId
```

### Session + Role flow

1. **Middleware:**
   - `getSessionAndRoleForMiddleware(req)` → session + role
   - Tjek rolle → redirect hvis forkert

2. **Server Component:**
   - `requireRole('buyer')` → userId + role
   - Hent data baseret på userId
   - Render med data

3. **Client Component (nav-bar):**
   - `supabase.auth.getSession()` → session
   - Hent role fra profiles
   - Vis korrekt UI baseret på rolle

---

## Noter

- Alle queries bruger Supabase RLS (Row Level Security) policies
- Data filtreres både i queries og i RLS policies
- Server components giver bedre performance end client components
- Centraliseret auth helper gør koden mere vedligeholdelig

