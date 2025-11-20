# 🎮 BlockBid Tender Detaljer Side

## 📋 Funktionalitet

### ✅ Implementerede Features

1. **Dynamisk Routing**
   - URL: `/tenders/[id]`
   - Henter `id` fra URL parametre
   - Server Component med async/await

2. **Data Henting fra Supabase**
   - Henter specifikt udbud med `eq('id', tenderId).single()`
   - Henter bruger information (hvis tilgængelig)
   - Henter eksisterende bud for udbuddet
   - Fejlhåndtering med `notFound()`

3. **Minecraft-inspireret Design**
   - Blokagtige kort med hover-effekter
   - Pixel font (Minecraft) på alle elementer
   - Grå/mørk baggrund med subtil pattern
   - Responsive layout

4. **TenderDetails Komponent**
   - Viser komplet udbudsinformation
   - Status badges og tags
   - Deadline countdown
   - Metadata grid layout
   - "Tilbage til Udbud" knap

5. **BidSection Komponent**
   - Bud oversigt med statistikker
   - Liste over eksisterende bud
   - Placeholder for budgivning formular
   - Status badges for bud

6. **Error Handling**
   - 404 side når udbud ikke findes
   - Brugervenlig fejlbesked
   - Navigation tilbage til udbudsliste

## 🎨 Design System

### Farver
- **Baggrund**: `from-gray-800 via-gray-900 to-black`
- **Kort**: Minecraft-stil med border og shadow
- **Status**: Grøn (publiceret), Rød (lukket), Blå (tildelt)
- **Bud Status**: Blå (indsendt), Gul (under gennemgang), Grøn (accepteret), Rød (afvist)

### Komponenter
- `TenderDetails` - Hovedkomponent til udbuds detaljer
- `BidSection` - Komponent til bud og budgivning
- `MinecraftCard` - Blokagtige kort
- `MinecraftButton` - Knapper med hover-effekter

### Layout
- **Header**: Navigation og status badges
- **Hovedindhold**: Udbuds detaljer i kort
- **Bud Sektion**: Oversigt og formular
- **Responsive**: Mobile-first design

## 🔧 Tekniske Detaljer

### Server Component
```tsx
export default async function TenderPage({ params }: TenderPageProps) {
  const supabase = createClient()
  const { data: tender, error } = await supabase
    .from('tenders')
    .select('*')
    .eq('id', params.id)
    .single()
}
```

### Database Queries
```sql
-- Hent udbud
SELECT * FROM tenders WHERE id = $1

-- Hent bruger (hvis tilgængelig)
SELECT email FROM users WHERE id = $1

-- Hent bud
SELECT * FROM bids WHERE tender_id = $1 ORDER BY created_at DESC
```

### Routing
- **Side**: `/tenders/[id]`
- **Not Found**: `/tenders/[id]/not-found.tsx`
- **Layout**: `/tenders/[id]/layout.tsx`

## 📱 Brugergrænseflade

### Header
- "← Tilbage til Udbud" knap
- Status badges (Publiceret, NY, etc.)

### Udbuds Detaljer
- Titel og beskrivelse
- Metadata grid (Enhed, Kategori, Værdi, Deadline, etc.)
- Tags (ESPD, TED)
- Deadline status
- Oprettet af information

### Bud Sektion
- Statistikker (Total bud, Accepterede, Afventende)
- Liste over eksisterende bud
- Formular til nyt bud (placeholder)

## 🎯 Brugerscenarier

1. **Bruger klikker på udbudskort**
   - Navigerer til `/tenders/[id]`
   - Ser komplet udbudsinformation
   - Kan se eksisterende bud

2. **Udbud ikke fundet**
   - Viser 404 side
   - Mulighed for at gå tilbage

3. **Budgivning**
   - Se statistikker over bud
   - Indsend nyt bud (kommer senere)

## 🔐 Authentication

- Side er beskyttet af middleware
- Kræver login for at se udbuds detaljer
- Automatisk redirect til `/login` hvis ikke logget ind

## 📊 Performance

- Server-side rendering
- Ingen client-side data fetching
- Optimeret billeder og font loading
- Responsive design for alle enheder

## 🚀 Næste Skridt

### 1. Budgivning Formular
- Implementer funktional formular
- Validering og gem i Supabase
- Real-time updates

### 2. Leverandør Integration
- Vis leverandør information
- Kvalifikationsstyring
- Dokument upload

### 3. Kommentarer og Diskussion
- Kommentar system
- Spørgsmål og svar
- Notifikationer

### 4. Avancerede Features
- Filtrering af bud
- Sortering muligheder
- Export funktionalitet

## 📝 Database Schema

### Tenders Table
```sql
tenders {
  id: string (primary key)
  title: string
  description: string
  entity_id: string
  category: string
  estimated_value: number
  currency: string
  submission_deadline: string
  publication_date: string
  status: 'draft' | 'published' | 'closed' | 'awarded'
  espd_required: boolean
  ted_published: boolean
  created_at: string
  updated_at: string
  created_by?: string (foreign key to users.id)
}
```

### Bids Table
```sql
bids {
  id: string (primary key)
  tender_id: string (foreign key to tenders.id)
  supplier_id: string (foreign key to suppliers.id)
  amount: number
  currency: string
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected'
  created_at: string
  updated_at: string
}
```

### Users Table
```sql
users {
  id: string (primary key)
  email: string
  created_at: string
}
``` 