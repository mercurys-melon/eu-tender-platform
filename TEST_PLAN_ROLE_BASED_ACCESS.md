# Testplan: Rollebaseret adgangskontrol og login/registrering

## Formål
Denne testplan sikrer, at login- og rollehåndteringen fungerer korrekt mellem Ordregiver (buyer) og Leverandør/Tilbudsgiver (supplier), og at der er vandtætte skodder mellem de to områder.

---

## 1. Test: Login som Buyer

### Forudsætning
- En bruger med rolle `buyer` eksisterer i systemet

### Testscenarie
1. Gå til `/login`
2. Log ind med buyer-brugerens credentials
3. Observer redirect efter login

### Forventet resultat
- ✅ Efter login redirectes til `/buyer`
- ✅ Dashboard-linket i nav-bar peger på `/buyer`
- ✅ Adgang til `/buyer` og alle undersider er tilladt
- ✅ Forsøg på at tilgå `/supplier` resulterer i redirect til `/buyer`

### Testcases
- [ ] Login redirecter korrekt til `/buyer`
- [ ] Dashboard-link i nav-bar vises og peger på `/buyer`
- [ ] Kan tilgå `/buyer`
- [ ] Kan tilgå `/buyer/mine-udbud`
- [ ] Kan tilgå `/buyer/opret`
- [ ] Kan tilgå `/buyer/afsluttede`
- [ ] Kan tilgå `/buyer/kontrakter`
- [ ] Forsøg på `/supplier` redirecter til `/buyer`
- [ ] Forsøg på `/supplier/aktive` redirecter til `/buyer`
- [ ] Login-knap er IKKE synlig i nav-bar når logget ind som buyer

---

## 2. Test: Login som Supplier

### Forudsætning
- En bruger med rolle `supplier` eksisterer i systemet

### Testscenarie
1. Gå til `/login`
2. Log ind med supplier-brugerens credentials
3. Observer redirect efter login

### Forventet resultat
- ✅ Efter login redirectes til `/supplier`
- ✅ Dashboard-linket i nav-bar peger på `/supplier`
- ✅ Adgang til `/supplier` og alle undersider er tilladt
- ✅ Forsøg på at tilgå `/buyer` resulterer i redirect til `/supplier`

### Testcases
- [ ] Login redirecter korrekt til `/supplier`
- [ ] Dashboard-link i nav-bar vises og peger på `/supplier`
- [ ] Kan tilgå `/supplier`
- [ ] Kan tilgå `/supplier/aktive`
- [ ] Kan tilgå `/supplier/afsluttede`
- [ ] Kan tilgå `/supplier/udbudsscanner`
- [ ] Kan tilgå `/supplier/soeg`
- [ ] Forsøg på `/buyer` redirecter til `/supplier`
- [ ] Forsøg på `/buyer/mine-udbud` redirecter til `/supplier`
- [ ] Login-knap er IKKE synlig i nav-bar når logget ind som supplier

---

## 3. Test: Registrering som Buyer

### Testscenarie
1. Gå til `/register?role=buyer` eller `/register` og vælg buyer-rolle
2. Udfyld registreringsformular
3. Opret konto
4. Observer redirect efter registrering

### Forventet resultat
- ✅ Efter registrering redirectes til `/buyer`
- ✅ Dashboard-linket i nav-bar peger på `/buyer`
- ✅ Adgang til `/buyer` er tilladt
- ✅ Adgang til `/supplier` er blokeret

### Testcases
- [ ] Registrering med `role=buyer` redirecter til `/buyer`
- [ ] Dashboard-link peger på `/buyer` efter registrering
- [ ] Kan tilgå `/buyer` efter registrering
- [ ] Forsøg på `/supplier` redirecter til `/buyer`

---

## 4. Test: Registrering som Supplier

### Testscenarie
1. Gå til `/register?role=supplier` eller `/register` og vælg supplier-rolle
2. Udfyld registreringsformular
3. Opret konto
4. Observer redirect efter registrering

### Forventet resultat
- ✅ Efter registrering redirectes til `/supplier`
- ✅ Dashboard-linket i nav-bar peger på `/supplier`
- ✅ Adgang til `/supplier` er tilladt
- ✅ Adgang til `/buyer` er blokeret

### Testcases
- [ ] Registrering med `role=supplier` redirecter til `/supplier`
- [ ] Dashboard-link peger på `/supplier` efter registrering
- [ ] Kan tilgå `/supplier` efter registrering
- [ ] Forsøg på `/buyer` redirecter til `/supplier`

---

## 5. Test: Ikke logget ind

### Testscenarie
1. Log ud (hvis logget ind)
2. Gå til forsiden
3. Observer nav-bar
4. Forsøg at tilgå beskyttede ruter direkte

### Forventet resultat
- ✅ Login-knap er synlig i nav-bar
- ✅ "Opret konto"-knap er synlig i nav-bar
- ✅ Dashboard-link er IKKE synligt
- ✅ Forsøg på `/buyer` redirecter til `/login?redirectTo=/buyer`
- ✅ Forsøg på `/supplier` redirecter til `/login?redirectTo=/supplier`
- ✅ Forsøg på `/buyer/mine-udbud` redirecter til `/login?redirectTo=/buyer/mine-udbud`

### Testcases
- [ ] Login-knap er synlig når ikke logget ind
- [ ] "Opret konto"-knap er synlig når ikke logget ind
- [ ] Dashboard-link er IKKE synligt når ikke logget ind
- [ ] Forsøg på `/buyer` redirecter til login med korrekt `redirectTo` parameter
- [ ] Forsøg på `/supplier` redirecter til login med korrekt `redirectTo` parameter
- [ ] Forsøg på `/buyer/mine-udbud` redirecter til login med korrekt `redirectTo` parameter
- [ ] Forsøg på `/supplier/aktive` redirecter til login med korrekt `redirectTo` parameter

---

## 6. Test: Buyer Dashboard (Data-driven)

### Forudsætning
- Logget ind som buyer
- Buyer har mindst ét udbud i Supabase (entity_id = buyer's user ID)
- Tilgå `/buyer`

### Testscenarie
1. Log ind som buyer
2. Gå til `/buyer`
3. Tjek dashboard-indhold og data

### Forventet resultat
- ✅ Velkomstsektion vises med korrekt tekst
- ✅ Statistik-overblik vises med RIGTIGE tal fra Supabase (ikke mock data)
- ✅ Sektion "Aktive udbud" viser KUN buyer's egne udbud (filtreret på entity_id)
- ✅ Sektion "Kommende deadlines" viser deadlines fra buyer's udbud
- ✅ Sektion "Seneste aktivitet" viser aktivitet relateret til buyer's udbud
- ✅ Sektion "Genveje" vises med knapper til hurtige handlinger
- ✅ Ingen data fra andre buyers vises (vandtæt adskillelse)

### Testcases - Data-integritet
- [ ] Velkomstsektion vises korrekt
- [ ] Statistik-kort viser korrekte tal baseret på buyer's udbud i Supabase
- [ ] "Aktive udbud"-sektion viser KUN udbud hvor entity_id = buyer's user ID
- [ ] Hvert udbud viser korrekt data fra Supabase:
  - [ ] Titel matcher database
  - [ ] Status matcher database (draft, published, closed, awarded)
  - [ ] Tilbudsfrist matcher submission_deadline fra database
  - [ ] Antal tilbud modtaget matcher antal bids i database for dette udbud
- [ ] "Kommende deadlines"-sektion viser deadlines fra buyer's udbud (næste 30 dage)
- [ ] "Seneste aktivitet"-sektion viser aktivitet fra buyer's udbud:
  - [ ] Spørgsmål fra leverandører om buyer's udbud
  - [ ] Nye tilbud modtaget til buyer's udbud
- [ ] Shortcut-knapper ("Åbn udbud", "Dokumenter", "Spørgsmål") fungerer
- [ ] "Genveje"-sektion vises med knapper:
  - [ ] "Opret nyt udbud" → `/buyer/opret`
  - [ ] "Se alle udbud" → `/buyer/mine-udbud`
  - [ ] "Administrer leverandører" → `/buyer/leverandorer`
  - [ ] "Skabeloner" → `/buyer/skabeloner`

### Testcases - Data-sikkerhed
- [ ] Buyer ser IKKE udbud fra andre buyers
- [ ] Buyer ser IKKE tilbud fra andre buyers' udbud
- [ ] Buyer ser IKKE spørgsmål fra andre buyers' udbud
- [ ] Hvis buyer har ingen udbud, vises "Ingen aktive udbud endnu" med link til opret
- [ ] Hvis buyer har ingen deadlines, vises "Ingen kommende deadlines"
- [ ] Hvis buyer har ingen aktivitet, vises "Ingen seneste aktivitet"

---

## 7. Test: Supplier Dashboard (Data-driven)

### Forudsætning
- Logget ind som supplier
- Supplier har en profil i suppliers-tabellen (user_id = supplier's user ID)
- Der findes mindst ét published udbud i systemet
- Tilgå `/supplier`

### Testscenarie
1. Log ind som supplier
2. Gå til `/supplier`
3. Tjek dashboard-indhold og data

### Forventet resultat
- ✅ Velkomstsektion vises med korrekt tekst
- ✅ Statistik-overblik vises med RIGTIGE tal fra Supabase
- ✅ Sektion "Åbne udbud" viser published udbud (ikke buyer-specific)
- ✅ Sektion "Dine aktive tilbud" viser KUN supplier's egne tilbud
- ✅ Sektion "Notifikationer" viser supplier's notifikationer
- ✅ Sektion "Seneste aktivitet" viser supplier's aktivitet
- ✅ Ingen data fra andre suppliers vises (vandtæt adskillelse)

### Testcases - Data-integritet
- [ ] Velkomstsektion vises korrekt
- [ ] Statistik-kort viser korrekte tal:
  - [ ] Antal åbne udbud (published tenders med fremtidig deadline)
  - [ ] Antal aktive tilbud (supplier's bids)
  - [ ] Antal ulæste notifikationer (supplier's notifications)
- [ ] "Åbne udbud"-sektion viser published udbud med fremtidig deadline
- [ ] Hvert åbent udbud viser korrekt data:
  - [ ] Titel matcher database
  - [ ] Ordregiver (entity_id) vises korrekt
  - [ ] Kategori vises korrekt
  - [ ] Tilbudsfrist matcher submission_deadline
- [ ] "Dine aktive tilbud"-sektion viser KUN tilbud hvor supplier_id = supplier's ID
- [ ] Hvert tilbud viser korrekt data:
  - [ ] Udbudstitel (fra tenders via join)
  - [ ] Status (submitted, under_review, accepted, rejected)
  - [ ] Beløb og valuta
  - [ ] Dato for afgivelse
- [ ] "Notifikationer"-sektion viser KUN notifikationer hvor user_id = supplier's user ID
- [ ] "Seneste aktivitet"-sektion viser:
  - [ ] Supplier's egne tilbud
  - [ ] Supplier's notifikationer
  - [ ] Svar på spørgsmål for udbud hvor supplier har tilbud
- [ ] "Genveje"-sektion vises med knapper:
  - [ ] "Søg udbud" → `/supplier/soeg`
  - [ ] "Mine tilbud" → `/supplier/aktive`
  - [ ] "Profil / Virksomhed" → `/supplier/profil`
  - [ ] "Udbudsscanner" → `/supplier/udbudsscanner`

### Testcases - Data-sikkerhed
- [ ] Supplier ser IKKE tilbud fra andre suppliers
- [ ] Supplier ser IKKE notifikationer fra andre suppliers
- [ ] Supplier ser IKKE private data fra buyers (kun public tender info)
- [ ] Hvis supplier mangler profil, vises besked om at oprette profil
- [ ] Hvis supplier har ingen tilbud, vises "Du har ikke afgivet nogen tilbud endnu"
- [ ] Hvis der er ingen åbne udbud, vises "Ingen åbne udbud lige nu"
- [ ] Hvis supplier har ingen notifikationer, vises "Ingen notifikationer"

---

## 8. Test: Edge Cases og Sikkerhed

### Testscenarie
1. Test forskellige kombinationer af roller og ruter
2. Test direkte URL-adgang
3. Test efter logout

### Forventet resultat
- ✅ Ingen hardcodede redirects hvor begge grene ender på `/supplier`
- ✅ Buyer og supplier er fuldstændig adskilt
- ✅ Ingen cross-role access mulig

### Testcases
- [ ] Buyer kan IKKE tilgå `/supplier` eller nogen supplier-undersider
- [ ] Supplier kan IKKE tilgå `/buyer` eller nogen buyer-undersider
- [ ] Efter logout redirectes korrekt til login ved forsøg på beskyttet route
- [ ] Session-timeout håndteres korrekt
- [ ] Direkte URL-adgang til beskyttede ruter respekterer rolle-beskyttelse
- [ ] Browser back/forward knapper respekterer rolle-beskyttelse

---

## 9. Test: Centraliseret Auth Helper

### Forudsætning
- Systemet bruger den centraliserede auth helper (`src/lib/auth/session.ts`)

### Testscenarie
1. Tjek at middleware bruger `getSessionAndRoleForMiddleware`
2. Tjek at server components bruger `getSessionAndRole` eller `requireRole`
3. Tjek at data er konsistent mellem middleware og server components

### Forventet resultat
- ✅ Middleware bruger centraliseret helper
- ✅ Server components bruger centraliseret helper
- ✅ Session + role hentes konsistent
- ✅ Ingen duplikeret logik

### Testcases
- [ ] Middleware.ts bruger `getSessionAndRoleForMiddleware` fra `@/lib/auth/session`
- [ ] Buyer dashboard bruger `requireRole('buyer')` fra `@/lib/auth/session`
- [ ] Supplier dashboard bruger `requireRole('supplier')` fra `@/lib/auth/session`
- [ ] Session + role er konsistent mellem middleware og server components
- [ ] Ingen duplikeret session/role-hentning i forskellige filer
- [ ] Hvis session mangler, redirectes korrekt til login
- [ ] Hvis rolle er forkert, redirectes korrekt til eget område

---

## 10. Test: Nav-bar opførsel

### Testscenarie
1. Test nav-bar i forskellige tilstande
2. Observer Dashboard-link og Login-knap

### Forventet resultat
- ✅ Nav-bar opdateres korrekt baseret på session-status
- ✅ Dashboard-link vises kun når logget ind
- ✅ Login-knap vises kun når IKKE logget ind

### Testcases
- [ ] Når ikke logget ind: Login-knap vises, Dashboard-link skjules
- [ ] Når logget ind som buyer: Dashboard-link vises med href="/buyer", Login-knap skjules
- [ ] Når logget ind som supplier: Dashboard-link vises med href="/supplier", Login-knap skjules
- [ ] Nav-bar opdateres korrekt efter login
- [ ] Nav-bar opdateres korrekt efter logout

---

## Fejlfinding

### Hvis login redirecter forkert:
1. Tjek browser console for fejl
2. Tjek at `finalRole` eller `initialRole` er korrekt sat
3. Tjek at redirect-logikken i login/register er korrekt

### Hvis rolle-beskyttelse ikke virker:
1. Tjek middleware.ts for korrekt implementering
2. Tjek at session hentes korrekt i middleware
3. Tjek at role hentes korrekt fra profiles-tabellen
4. Tjek browser console og server logs

### Hvis nav-bar ikke opdateres:
1. Tjek at `useEffect` i nav-bar.tsx kører korrekt
2. Tjek at session-state opdateres ved auth state changes
3. Tjek at userRole hentes korrekt fra profiles-tabellen

---

## Acceptkriterier

Alle følgende skal være opfyldt for at acceptere implementeringen:

### Basis-funktionalitet
- ✅ Buyer redirecter til `/buyer` efter login/registrering
- ✅ Supplier redirecter til `/supplier` efter login/registrering
- ✅ Ingen hardcodede redirects hvor begge grene ender på `/supplier`
- ✅ Buyer kan IKKE tilgå `/supplier` området
- ✅ Supplier kan IKKE tilgå `/buyer` området
- ✅ Login-knap vises kun når ikke logget ind
- ✅ Dashboard-link vises kun når logget ind
- ✅ Dashboard-link peger på korrekt område baseret på rolle
- ✅ Ikke-autentificerede brugere redirectes til login

### Data-integritet
- ✅ Buyer dashboard viser KUN buyer's egne udbud (entity_id = user ID)
- ✅ Supplier dashboard viser KUN supplier's egne tilbud (supplier_id = supplier ID)
- ✅ Buyer dashboard bruger rigtige data fra Supabase (ikke mock data)
- ✅ Supplier dashboard bruger rigtige data fra Supabase (ikke mock data)
- ✅ Statistik viser korrekte tal baseret på faktiske data
- ✅ Deadlines, aktivitet og notifikationer er korrekte og relevante

### Data-sikkerhed
- ✅ Buyer ser IKKE data fra andre buyers
- ✅ Supplier ser IKKE data fra andre suppliers
- ✅ Ingen cross-role data leakage
- ✅ Alle queries filtrerer korrekt på user ID / entity ID / supplier ID

### Kode-kvalitet
- ✅ Centraliseret auth helper bruges i middleware og server components
- ✅ Ingen duplikeret session/role-hentning
- ✅ Konsistent brug af `requireRole` i server components

---

## 11. Test: Tender Lifecycle Flow

### Formål
Teste at tender lifecycle fungerer korrekt gennem alle faser fra oprettelse til afslutning.

### Testscenarie 1: Opret og publicér udbud (Buyer)

**Forudsætning:**
- Logget ind som buyer

**Testcases:**
- [ ] Opret nyt udbud → status = `draft`
- [ ] Udbud vises i buyer-dashboard under "Udbud i forberedelse"
- [ ] Status-badge viser "Udkast"
- [ ] Publicér udbud → status = `published`
- [ ] Udbud vises nu med status "Offentliggjort"
- [ ] Udbud dukker op i supplier-søgning (hvis supplier er logget ind)

### Testscenarie 2: Supplier anmoder om deltagelse

**Forudsætning:**
- Buyer har et published udbud
- Logget ind som supplier

**Testcases:**
- [ ] Supplier ser udbud i "Åbne udbud du kan byde på"
- [ ] Supplier klikker "Anmod om deltagelse"
- [ ] `tender_participants` record oprettes med `supplier_status = 'interest_submitted'`
- [ ] Supplier ser nu udbud i "Dine aktive tilbud" med status "Ansøgning sendt"
- [ ] Buyer kan se supplier i deltagerliste

### Testscenarie 3: Prækvalifikation

**Forudsætning:**
- Supplier har anmodet om deltagelse
- Logget ind som buyer

**Testcases:**
- [ ] Buyer kan se supplier med status "Ansøgning sendt"
- [ ] Buyer prækvalificerer supplier → `supplier_status = 'prequalified'`
- [ ] Supplier ser status opdateret til "Prækvalificeret"
- [ ] Buyer sætter tender til `prequalification` fase
- [ ] Tender vises med status "Prækvalifikation" i buyer-dashboard

### Testscenarie 4: Tilbudsfase

**Forudsætning:**
- Supplier er prækvalificeret
- Logget ind som buyer og supplier

**Testcases:**
- [ ] Buyer sætter tender til `bidding` → status = `bidding`
- [ ] Tender vises med status "Tilbudsfrist" i buyer-dashboard
- [ ] Supplier ser udbud i "Åbne udbud du kan byde på" med knap "Afgiv tilbud"
- [ ] Supplier starter tilbud → `supplier_status = 'proposal_in_progress'`
- [ ] Supplier ser status "Tilbudskladde"
- [ ] Supplier indsender tilbud → `supplier_status = 'proposal_submitted'`
- [ ] Supplier ser status "Tilbud indsendt"
- [ ] Buyer kan se antal tilbud modtaget i dashboard

### Testscenarie 5: Evaluering

**Forudsætning:**
- Supplier har indsendt tilbud
- Logget ind som buyer

**Testcases:**
- [ ] Buyer sætter tender til `evaluation` → status = `evaluation`
- [ ] Tender vises med status "Evalueres" i buyer-dashboard
- [ ] Supplier ser status "Under evaluering" i "Dine aktive tilbud"
- [ ] Buyer kan evaluere tilbud

### Testscenarie 6: Tildeling

**Forudsætning:**
- Tender er i evaluering
- Logget ind som buyer

**Testcases:**
- [ ] Buyer tildeler til vinder → vinder får `supplier_status = 'awarded'`
- [ ] Andre suppliers får `supplier_status = 'not_awarded'`
- [ ] Buyer sætter tender til `awarded` → status = `awarded`
- [ ] Tender vises i "Tildelte udbud" sektion i buyer-dashboard
- [ ] Vinder ser udbud i "Resultater" med status "Tildelt"
- [ ] Tabere ser udbud i "Resultater" med status "Ikke tildelt"

### Testscenarie 7: Afslutning

**Forudsætning:**
- Tender er tildelt
- Logget ind som buyer

**Testcases:**
- [ ] Buyer sætter tender til `closed` → status = `closed`
- [ ] Tender vises i "Afsluttede/Annullerede udbud" sektion
- [ ] Status-badge viser "Afsluttet"
- [ ] Tender vises ikke længere i "Udbud aktivt"

### Testscenarie 8: Annullering

**Forudsætning:**
- Tender er i aktiv fase (fx `published` eller `bidding`)
- Logget ind som buyer

**Testcases:**
- [ ] Buyer annullerer tender → status = `cancelled`
- [ ] Tender vises i "Afsluttede/Annullerede udbud" sektion
- [ ] Status-badge viser "Annulleret"
- [ ] Suppliers får notifikation om annullering
- [ ] Suppliers ser status opdateret

### Testscenarie 9: Status-transitions (Validering)

**Forudsætning:**
- Logget ind som buyer

**Testcases:**
- [ ] `draft` → `published` → tilladt
- [ ] `draft` → `awarded` → IKKE tilladt (skal gå gennem published først)
- [ ] `published` → `bidding` → tilladt
- [ ] `bidding` → `evaluation` → tilladt
- [ ] `evaluation` → `awarded` → tilladt
- [ ] `awarded` → `closed` → tilladt
- [ ] `closed` → `published` → IKKE tilladt (terminal state)
- [ ] `cancelled` → `published` → IKKE tilladt (terminal state)

### Testscenarie 10: Supplier-status-transitions

**Forudsætning:**
- Supplier har deltagelse i tender
- Logget ind som buyer og supplier

**Testcases:**
- [ ] `interest_submitted` → `prequalified` → tilladt (buyer)
- [ ] `interest_submitted` → `proposal_submitted` → IKKE tilladt
- [ ] `prequalified` → `proposal_in_progress` → tilladt (supplier)
- [ ] `proposal_in_progress` → `proposal_submitted` → tilladt (supplier)
- [ ] `proposal_submitted` → `under_evaluation` → tilladt (buyer)
- [ ] `under_evaluation` → `awarded` → tilladt (buyer)
- [ ] `awarded` → `proposal_in_progress` → IKKE tilladt (terminal state)

### Testscenarie 11: UI-komponenter

**Testcases:**
- [ ] TenderStatusBadge viser korrekt label for hver status
- [ ] TenderStatusBadge har korrekt farve for hver status
- [ ] SupplierStatusBadge viser korrekt label for hver status
- [ ] SupplierStatusBadge har korrekt farve for hver status
- [ ] Status-badges vises korrekt i buyer-dashboard
- [ ] Status-badges vises korrekt i supplier-dashboard

### Testscenarie 12: Dashboard-gruppering

**Buyer Dashboard:**
- [ ] "Udbud i forberedelse" viser tenders med status: `draft`
- [ ] "Udbud aktivt" viser tenders med status: `published`, `prequalification`, `bidding`, `evaluation`
- [ ] "Tildelte udbud" viser tenders med status: `awarded`
- [ ] "Afsluttede/Annullerede udbud" viser tenders med status: `closed`, `cancelled`

**Supplier Dashboard:**
- [ ] "Åbne udbud du kan byde på" viser tenders hvor supplier ikke er registreret eller er prequalified
- [ ] "Dine aktive tilbud" viser participations med status: `interest_submitted`, `prequalified`, `proposal_in_progress`, `proposal_submitted`, `under_evaluation`
- [ ] "Resultater" viser participations med status: `awarded`, `not_awarded`

---

## Noter

- Test i både development og production mode
- Test med forskellige browsere (Chrome, Firefox, Safari)
- Test med incognito/private browsing mode
- Test med forskellige session-scenarier (frisk login, eksisterende session, udløbet session)
- **Lifecycle:** Test alle status-transitions i rækkefølge
- **Data-integritet:** Verificer at status ændringer gemmes korrekt i database
- **RLS:** Verificer at RLS policies respekterer lifecycle-status

