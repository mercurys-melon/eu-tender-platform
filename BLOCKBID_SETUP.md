# BlockBid Setup Guide

## 🎮 Minecraft-inspireret Udbudsplatform

BlockBid er en Minecraft-inspireret udbudsplatform bygget med Next.js 14, Supabase og Tailwind CSS.

## 🚀 Hurtig Start

### 1. Installer Dependencies
```bash
npm install
```

### 2. Opsæt Environment Variables
Opret en `.env.local` fil i roden:
```env
NEXT_PUBLIC_SUPABASE_URL=din_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=din_supabase_anon_key
```

### 3. Tilføj Minecraft Font
1. Download `MinecraftRegular-Bmg3.otf` fonten
2. Placer den i `public/fonts/` mappen
3. Eller brug en alternativ pixel font (se `public/fonts/README.md`)

### 4. Start Development Server
```bash
npm run dev
```

## 📁 Projektstruktur

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login side
│   │   └── register/page.tsx       # Registrerings side
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Landing page
│   └── globals.css                 # Global styling
├── components/
│   ├── auth/
│   │   ├── auth-form.tsx          # Auth form komponent
│   │   └── auth-layout.tsx        # Auth layout
│   └── ui/
│       ├── minecraft-button.tsx    # Minecraft knap
│       ├── minecraft-input.tsx     # Minecraft input
│       └── minecraft-card.tsx      # Minecraft kort
├── hooks/
│   └── use-auth.ts                # Auth hook
├── lib/
│   └── supabase/
│       └── client.ts              # Supabase client
└── middleware.ts                  # Auth middleware
```

## 🎨 Design System

### Minecraft-stil Komponenter
- **MinecraftButton**: Blokagtige knapper med hover-effekter
- **MinecraftInput**: Pixel-stil input felter
- **MinecraftCard**: Blokagtige kort med hover-animationer

### Farver
- **Grøn**: `bg-green-600` (primær)
- **Grå**: `bg-gray-600` (sekundær)
- **Rød**: `bg-red-600` (fare)
- **Brun**: `bg-amber-200` (kort variant)

### Font
- **Minecraft**: Pixel-perfekt font til hele applikationen

## 🔐 Authentication

### Login Flow
1. Bruger besøger `/login`
2. Indtaster email og adgangskode
3. Supabase håndterer authentication
4. Automatisk redirect til `/tenders`

### Registrering Flow
1. Bruger besøger `/register`
2. Opretter ny konto
3. Email bekræftelse sendes
4. Redirect til login efter oprettelse

### Beskyttede Ruter
- `/tenders/*` - Kræver login
- `/create/*` - Kræver login
- `/dashboard/*` - Kræver login

## 🛠️ Næste Skridt

### 1. Opret Udbud Formular
- Side: `/create`
- Felter: titel, beskrivelse
- Gem i Supabase `tenders` tabel

### 2. Udbud Liste
- Side: `/tenders`
- Hent alle udbud fra Supabase
- Vis i Minecraft-stil kort

### 3. Udbud Detaljer
- Side: `/tenders/[id]`
- Vis udbud detaljer
- Formular til at indsende bud

### 4. Bud System
- Formular til at indsende bud
- Beløb + besked
- Gem i `bids` tabel

## 🎯 Features Implementeret

✅ **Login/Registrering**
- Supabase Auth integration
- Minecraft-stil formularer
- Automatisk redirect

✅ **Authentication Hook**
- `useAuth()` hook
- Session management
- Loading states

✅ **Minecraft Design System**
- Blokagtige komponenter
- Pixel font styling
- Hover-effekter

✅ **Middleware**
- Route protection
- Automatic redirects
- Session validation

## 🔧 Tekniske Detaljer

### Supabase Integration
- Authentication med email/password
- Session management
- Middleware protection

### Next.js 14 Features
- App Router
- Server Components
- Client Components hvor nødvendigt

### Tailwind CSS
- Custom Minecraft styling
- Responsive design
- Dark mode support (klar til implementering)

## 🚀 Deployment

### Vercel (Anbefalet)
1. Push til GitHub
2. Connect til Vercel
3. Tilføj environment variables
4. Deploy automatisk

### Andre Platforme
- Netlify
- Railway
- DigitalOcean App Platform

## 📝 Noter

- Minecraft font skal downloades separat
- Supabase projekt skal opsættes med authentication
- Database schema er klar i `supabase/migrations/`
- Alle komponenter er TypeScript-typerede
- Responsive design på alle sider 