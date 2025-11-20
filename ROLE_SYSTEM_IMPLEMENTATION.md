# Rolle-baseret System Implementation

## Oversigt
Dette dokument beskriver implementeringen af det nye rolle-baserede system med to login-typer: Leverandør (Supplier) og Ordregiver (Buyer).

## Implementerede Features

### 1. Database Schema
- **Profiles tabel**: Oprettet med `user_role` enum ('supplier', 'buyer')
- **Automatisk profil oprettelse**: Trigger der opretter profil ved ny bruger registrering
- **RLS policies**: Sikkerhed for at brugere kun kan se/redigere deres egen profil

### 2. Rolle Management
- **src/lib/roles.ts**: Helper funktioner til rolle-håndtering
- **Type safety**: TypeScript typer for rolle-validering
- **localStorage integration**: Gemmer foretrukket rolle mellem sessioner

### 3. Forside Integration
- **Rolle-valg sektion**: To kort under hero sektionen
- **Direkte links**: Links til login/register med rolle-query parametre
- **Responsive design**: Side-om-side på desktop, stacked på mobil

### 4. Authentication Flow
- **Login side**: Læser rolle fra query parameter og localStorage
- **Register side**: Sætter rolle ved oprettelse af ny bruger
- **Automatisk redirect**: Baseret på brugerens rolle efter login

### 5. Dashboard System

#### Supplier Dashboard (/supplier)
- **Hovedside**: Oversigt med favoritter, aktivitet og notifikationer
- **Søg udbud**: Søgefelt med favorit-markering (⭐)
- **Aktive udbud**: Liste over deltagelser
- **Afsluttede udbud**: Historik over tidligere deltagelser

#### Buyer Dashboard (/buyer)
- **Hovedside**: Oversigt med aktive udbud, tildelinger og kontrakter
- **Mine udbud**: Liste over oprettede udbud
- **Opret udbud**: Formular-skelet med titel, beskrivelse, frist og dokumenter
- **Afsluttede udbud**: Historik over lukkede udbud
- **Igangværende kontrakter**: Liste over aktive kontrakter

### 6. Navigation
- **Rolle-specifik dashboard link**: NavBar viser korrekt dashboard baseret på rolle
- **Aktiv state**: Bevares for navigation
- **Logo størrelse**: Justeret til 6x6 som specificeret

### 7. Middleware Security
- **Rolle-beskyttelse**: /supplier og /buyer ruter kræver korrekt rolle
- **Automatisk redirect**: Hvis bruger prøver at tilgå forkert rolle-område
- **Session validering**: Sikrer at kun autentificerede brugere kan tilgå beskyttede områder

## Fil Struktur

```
src/
├── lib/
│   └── roles.ts                    # Rolle helper funktioner
├── app/
│   ├── page.tsx                    # Forside med rolle-valg
│   ├── (auth)/
│   │   ├── login/page.tsx          # Opdateret login med rolle-håndtering
│   │   └── register/page.tsx       # Opdateret register med rolle-sætning
│   ├── supplier/
│   │   ├── layout.tsx              # Supplier layout
│   │   ├── page.tsx                # Supplier hovedside
│   │   ├── soeg/page.tsx           # Søg udbud med favoritter
│   │   ├── aktive/page.tsx         # Aktive udbud
│   │   └── afsluttede/page.tsx     # Afsluttede udbud
│   └── buyer/
│       ├── layout.tsx              # Buyer layout
│       ├── page.tsx                # Buyer hovedside
│       ├── mine-udbud/page.tsx     # Mine udbud
│       ├── opret/page.tsx          # Opret udbud formular
│       ├── afsluttede/page.tsx     # Afsluttede udbud
│       └── kontrakter/page.tsx     # Igangværende kontrakter
├── components/layout/
│   └── nav-bar.tsx                 # Opdateret med rolle-specifik navigation
└── middleware.ts                   # Rolle-beskyttelse

supabase/migrations/
└── 003_profiles_roles.sql          # Database migration
```

## UI/UX Features

### Design System
- **Konsistent styling**: Bruger eksisterende Tailwind klasser fra globals.css
- **Card layout**: p-6, rounded-xl, shadow-blockbid
- **Button styles**: btn-primary og btn-outline
- **Typography**: Poppins til overskrifter, Inter til brødtekst
- **Color scheme**: Granite Grey til tekst, Nordic Blue til primær farver

### Responsive Design
- **Mobile-first**: Grid layouts der tilpasser sig skærmstørrelse
- **Touch-friendly**: Knapper og links optimeret til touch
- **Accessibility**: Proper ARIA labels og focus states

## Mock Data
Alle lister bruger mock data for nu, som specificeret i kravet. Dette gør det nemt at teste funktionaliteten uden at skulle sætte op kompleks data integration.

## Næste Skridt
1. **Database integration**: Erstat mock data med ægte Supabase queries
2. **Favorit system**: Implementer persistent favorit gemning
3. **Udbud oprettelse**: Fuld funktionalitet for at oprette ægte udbud
4. **Dokument upload**: Implementer fil upload funktionalitet
5. **Notifikationer**: Real-time notifikationer for nye udbud og opdateringer

## Test Scenarios
1. **Rolle valg**: Vælg leverandør/ordregiver fra forsiden
2. **Login flow**: Test login med rolle-query parameter
3. **Register flow**: Test registrering med rolle-sætning
4. **Dashboard access**: Verificer korrekt redirect baseret på rolle
5. **Navigation**: Test rolle-specifik navigation i NavBar
6. **Security**: Test middleware beskyttelse og rolle-redirects
