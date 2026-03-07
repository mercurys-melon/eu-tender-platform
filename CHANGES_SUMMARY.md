# Sammenfatning af ændringer: Rollebaseret login og adgangskontrol

## Oversigt
Denne dokumentation beskriver alle ændringer foretaget for at implementere en ren, konsistent login- og rollehåndtering mellem Ordregiver (buyer) og Leverandør/Tilbudsgiver (supplier) med vandtætte skodder mellem de to områder.

---

## 1. Ret redirect efter login og registrering

### Fil: `src/app/(auth)/login/page.tsx`

**Problem:** Begge grene i redirect-logikken førte til `/supplier`.

**Ændring:**
```diff
- router.replace(finalRole === 'buyer' ? '/supplier' : '/supplier')
+ router.replace(finalRole === 'buyer' ? '/buyer' : '/supplier')
```

**Forklaring:** Efter login hentes brugerens rolle fra profiles-tabellen. Hvis rolle er `buyer`, redirectes til `/buyer`. Hvis rolle er `supplier`, redirectes til `/supplier`.

---

### Fil: `src/app/(auth)/register/page.tsx`

**Problem:** Begge grene i redirect-logikken førte til `/supplier`.

**Ændring:**
```diff
- router.replace(initialRole === 'buyer' ? '/supplier' : '/supplier')
+ router.replace(initialRole === 'buyer' ? '/buyer' : '/supplier')
```

**Forklaring:** Efter registrering bruges `initialRole` fra query-parameter eller default. Hvis `initialRole` er `buyer`, redirectes til `/buyer`. Hvis `initialRole` er `supplier`, redirectes til `/supplier`.

---

## 2. Opdater nav-bar, så Dashboard + Login opfører sig korrekt

### Fil: `src/components/layout/nav-bar.tsx`

**Problem:** Dashboard-linket pegede altid på `/supplier`, uanset rolle.

**Ændring:**
```diff
- <Link 
-   href={userRole === 'buyer' ? '/supplier' : '/supplier'} 
-   className="..."
- >
-   Dashboard
- </Link>
+ {userRole && (
+   <Link 
+     href={userRole === 'buyer' ? '/buyer' : '/supplier'} 
+     className="..."
+   >
+     Dashboard
+   </Link>
+ )}
```

**Forklaring:**
- Dashboard-linket vises kun når `userRole` er sat (dvs. når brugeren er logget ind)
- Linket peger på `/buyer` hvis `userRole === 'buyer'`
- Linket peger på `/supplier` hvis `userRole === 'supplier'`
- Login-knappen vises kun når `!session` (ikke logget ind)

---

## 3. Indfør "vandtætte skodder" i routing (role-based protection)

### Fil: `src/middleware.ts`

**Problem:** Middleware tjekkede kun for session, ikke for rolle. Der var ingen beskyttelse mod cross-role access.

**Ændring:** Implementeret rollebaseret adgangskontrol i middleware.

**Implementering:**
1. **Session-tjek:** Hvis ingen session, redirect til `/login` med `redirectTo` parameter
2. **Rolle-hentning:** Hent brugerens rolle fra `profiles`-tabellen baseret på session user ID
3. **Rolle-beskyttelse:**
   - Hvis pathname starter med `/buyer` og rolle er IKKE `buyer` → redirect til `/supplier`
   - Hvis pathname starter med `/supplier` og rolle er IKKE `supplier` → redirect til `/buyer`

**Kode-struktur:**
```typescript
// For /buyer og /supplier routes
if (pathname.startsWith('/buyer') || pathname.startsWith('/supplier')) {
  // Get session
  const { data: { session } } = await supabase.auth.getSession()
  
  // If no session, redirect to login
  if (!session) {
    return NextResponse.redirect(new URL('/login?redirectTo=' + pathname, req.url))
  }
  
  // Get user role from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle()
  
  const userRole = profile?.role as UserRole | undefined
  
  // Role-based access control
  if (pathname.startsWith('/buyer') && userRole !== 'buyer') {
    return NextResponse.redirect(new URL('/supplier', req.url))
  }
  
  if (pathname.startsWith('/supplier') && userRole !== 'supplier') {
    return NextResponse.redirect(new URL('/buyer', req.url))
  }
}
```

**Forklaring:**
- Session + rolle hentes via Supabase SSR client i middleware
- Middleware kører før hver request til beskyttede ruter
- Hvis forkert rolle, redirectes til brugerens eget område
- Hvis ingen session, redirectes til login med `redirectTo` parameter

---

## 4. Opret/opdater /buyer-dashboard

### Fil: `src/app/buyer/page.tsx`

**Status:** Dashboard eksisterede allerede, men blev forbedret med alle påkrævede sektioner.

**Nye sektioner:**

1. **Velkomstsektion**
   - Velkomstbesked med kort beskrivelse
   - Gradient baggrund for visuel interesse

2. **Statistik-overblik**
   - Antal aktive udbud
   - Antal udbud i forberedelse
   - Antal udbud afsluttet inden for sidste 12 måneder

3. **Aktive udbud**
   - Liste/cards med udbud
   - Hvert udbud viser:
     - Titel
     - Status (med farvekodet badge)
     - Tilbudsfrist-dato
     - Antal inviterede/ansøgere
   - Shortcut-knapper: "Åbn udbud", "Dokumenter", "Spørgsmål"

4. **Kommende deadlines**
   - Liste med næste 3-5 deadlines
   - Viser: dato, udbudstitel, type af deadline (tilbudsfrist, frist for spørgsmål, evalueringsfrist)

5. **Seneste aktivitet**
   - Seneste events med ikoner:
     - Nye spørgsmål fra leverandører
     - Nye tilbud modtaget
     - Opdaterede dokumenter
   - "Time ago" formatering (fx "2 timer siden")

6. **Genveje / Hurtige handlinger**
   - "Opret nyt udbud" → `/buyer/opret`
   - "Se alle udbud" → `/buyer/mine-udbud`
   - "Administrer leverandører" → `/buyer/leverandorer`
   - "Skabeloner" → `/buyer/skabeloner`

**Tekniske detaljer:**
- Bruger eksisterende UI-komponenter (`card`, `btn-primary`, `btn-outline`, etc.)
- Mock data bruges (skal erstattes med rigtige data fra Supabase)
- Responsive layout med grid-system
- Bruger `date-fns` for datoformatering

---

## 5. Testplan

### Fil: `TEST_PLAN_ROLE_BASED_ACCESS.md`

Oprettet en omfattende testplan med følgende testscenarier:

1. **Login som Buyer** - Tjek redirect, Dashboard-link, adgang til `/buyer`, blokering af `/supplier`
2. **Login som Supplier** - Tjek redirect, Dashboard-link, adgang til `/supplier`, blokering af `/buyer`
3. **Registrering som Buyer** - Tjek redirect efter registrering
4. **Registrering som Supplier** - Tjek redirect efter registrering
5. **Ikke logget ind** - Tjek login-knap, redirect til login ved direkte adgang
6. **Buyer Dashboard** - Tjek alle sektioner vises korrekt
7. **Edge Cases og Sikkerhed** - Tjek cross-role access, session-timeout, etc.
8. **Nav-bar opførsel** - Tjek Dashboard-link og Login-knap vises korrekt

---

## Vigtige pointer

### ✅ Opfyldte krav

- ✅ Ingen hardcodede redirects hvor begge grene ender på `/supplier`
- ✅ Login-knap vises kun når ikke logget ind
- ✅ Dashboard-link vises kun når logget ind
- ✅ Buyer og supplier er fuldstændig adskilt i UI og routing
- ✅ `/buyer` fungerer som et ordregiver-dashboard med fornuftigt første udbuds-overblik
- ✅ Role-based protection i middleware sikrer vandtætte skodder

### 🔧 Tekniske detaljer

- **Session-hentning:** Bruger Supabase SSR client i middleware
- **Rolle-hentning:** Henter fra `profiles`-tabellen baseret på session user ID
- **Redirect-logik:** Buyer → `/buyer`, Supplier → `/supplier`
- **Cross-role protection:** Middleware redirecter forkert rolle til deres eget område

### 📝 Noter

- Mock data bruges i buyer dashboard - skal erstattes med rigtige data fra Supabase
- Middleware bruger Supabase SSR client, som er kompatibel med Next.js 14
- Alle ændringer er testet for linting-fejl og er fejlfri

---

## Næste skridt

1. **Test alle scenarier** fra testplanen
2. **Erstat mock data** i buyer dashboard med rigtige data fra Supabase
3. **Tilføj loading states** i buyer dashboard når data hentes
4. **Tilføj error handling** hvis data-hentning fejler
5. **Overvej at tilføje** samme dashboard-struktur til supplier-området for konsistens

