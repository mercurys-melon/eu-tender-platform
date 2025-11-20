# 🎮 BlockBid Tenders Side

## 📋 Funktionalitet

### ✅ Implementerede Features

1. **Hent Data fra Supabase**
   - Server Component der henter alle udbud
   - Sorteret efter `created_at` (nyeste først)
   - Fejlhåndtering med brugervenlig besked

2. **Minecraft-inspireret Design**
   - Blokagtige kort med hover-effekter
   - Pixel font (Minecraft) på alle elementer
   - Grå/mørk baggrund med subtil pattern
   - Responsive grid layout (1-3 kolonner)

3. **TenderCard Komponent**
   - Viser titel, beskrivelse og metadata
   - Status badges (Publiceret, Lukket, etc.)
   - "NY" badge for nyligt oprettede udbud
   - ESPD/TED tags
   - Klikbar - linker til `/tenders/[id]`
   - "Byde Nu" knap for aktive udbud

4. **Navigation og Layout**
   - NavBar med BlockBid logo og navigation
   - "Opret Nyt Udbud" knap i toppen
   - Tom-tilstand med CTA til at oprette første udbud

5. **Tidsformatering**
   - Human-readable datoer ("2 dage siden")
   - Deadline countdown
   - Oprettelsesdato visning

## 🎨 Design System

### Farver
- **Baggrund**: `from-gray-800 via-gray-900 to-black`
- **Kort**: Minecraft-stil med border og shadow
- **Status**: Grøn (publiceret), Rød (lukket), Blå (tildelt)

### Komponenter
- `MinecraftCard` - Blokagtige kort
- `MinecraftButton` - Knapper med hover-effekter
- `TenderCard` - Specialiseret kort til udbud
- `NavBar` - Navigation med authentication

### Responsive Design
- **Mobile**: 1 kolonne
- **Tablet**: 2 kolonner  
- **Desktop**: 3 kolonner

## 🔧 Tekniske Detaljer

### Server Component
```tsx
export default async function TendersPage() {
  const supabase = createClient()
  const { data: tenders, error } = await supabase
    .from('tenders')
    .select('*')
    .order('created_at', { ascending: false })
}
```

### Database Schema
```sql
tenders {
  id: string
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
}
```

### Routing
- **Side**: `/tenders`
- **Detaljer**: `/tenders/[id]` (kommer senere)
- **Opret**: `/create` (kommer senere)

## 🚀 Næste Skridt

### 1. Udbud Detaljer Side
- Side: `/tenders/[id]`
- Vis komplet udbudsinformation
- Formular til at indsende bud

### 2. Opret Udbud Side
- Side: `/create`
- Formular til at oprette nyt udbud
- Validering og gem i Supabase

### 3. Budgivning System
- Formular til at indsende bud
- Beløb og besked
- Gem i `bids` tabel

### 4. Filtrering og Søgning
- Søg efter titel/beskrivelse
- Filtrer på kategori/status
- Sortering muligheder

## 📱 Brugergrænseflade

### Header
- BlockBid logo (hjem)
- "Udbud" knap
- Login/Logout status

### Hovedindhold
- "Aktive Udbud" titel
- "+ Opret Nyt Udbud" knap
- Grid med udbudskort

### Kort Information
- Titel og beskrivelse
- Enhed og kategori
- Estimeret værdi
- Deadline
- Status badges
- Oprettelsesdato

## 🎯 Brugerscenarier

1. **Bruger besøger /tenders**
   - Ser liste over alle aktive udbud
   - Kan klikke på kort for detaljer
   - Kan oprette nyt udbud

2. **Ingen udbud**
   - Viser tom-tilstand
   - CTA til at oprette første udbud

3. **Fejl ved indlæsning**
   - Viser fejlbesked
   - Mulighed for at prøve igen

## 🔐 Authentication

- Side er beskyttet af middleware
- Kræver login for at se udbud
- Automatisk redirect til `/login` hvis ikke logget ind

## 📊 Performance

- Server-side rendering
- Ingen client-side data fetching
- Optimeret billeder og font loading
- Responsive design for alle enheder 