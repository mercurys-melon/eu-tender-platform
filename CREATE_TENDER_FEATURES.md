# 🎮 BlockBid Opret Udbud Side

## 📋 Funktionalitet

### ✅ Implementerede Features

1. **Authentication Protection**
   - Kun loggede-in brugere kan tilgå siden
   - Automatisk redirect til `/login` hvis ikke logget ind
   - Loading state mens authentication tjekkes

2. **Komplet Formular**
   - Titel og beskrivelse (påkrævet)
   - Enhed og kategori (påkrævet)
   - Estimeret værdi og valuta
   - Publiceringsdato og deadline (påkrævet)
   - ESPD og TED checkboxes (valgfrit)

3. **Form Validation**
   - Real-time validering
   - Fejlbeskeder på dansk
   - Dato validering (deadline skal være efter publicering)
   - Beløb validering (skal være positivt)

4. **Supabase Integration**
   - Gemmer data i `tenders` tabellen
   - Sætter `created_by` til brugerens ID
   - Status sættes automatisk til 'published'
   - Error handling med brugervenlige beskeder

5. **Minecraft-inspireret Design**
   - Blokagtige formularer med hover-effekter
   - Pixel font (Minecraft) på alle elementer
   - Responsive grid layout
   - Success state med animation

6. **User Experience**
   - Loading states under submission
   - Success besked med redirect
   - Mulighed for at oprette nyt udbud
   - Navigation tilbage til udbudsliste

## 🎨 Design System

### Farver
- **Baggrund**: `from-gray-800 via-gray-900 to-black`
- **Formularer**: Minecraft-stil med border og shadow
- **Fejl**: Rød border og baggrund
- **Success**: Grøn tekst og ikoner

### Komponenter
- `CreateTenderForm` - Hovedkomponent med formular
- `MinecraftInput` - Input felter med validering
- `MinecraftButton` - Knapper med hover-effekter
- `MinecraftCard` - Blokagtige kort

### Layout
- **Header**: Navigation og titel
- **Formular**: Grid layout med felter
- **Responsive**: Mobile-first design
- **Success State**: Centreret kort med besked

## 🔧 Tekniske Detaljer

### Client Component
```tsx
'use client'

export default function CreatePage() {
  const { user, loading } = useAuth()
  // Authentication check og form handling
}
```

### Form Validation
```tsx
const validateForm = (): boolean => {
  const newErrors: FormErrors = {}
  
  if (!formData.title.trim()) {
    newErrors.title = 'Titel er påkrævet'
  }
  
  // Dato validering
  if (submissionDate <= publicationDate) {
    newErrors.submission_deadline = 'Deadline skal være efter publiceringsdato'
  }
  
  return Object.keys(newErrors).length === 0
}
```

### Supabase Insert
```tsx
const { error } = await supabase
  .from('tenders')
  .insert([{
    title: formData.title.trim(),
    description: formData.description.trim(),
    entity_id: formData.entity_id.trim(),
    category: formData.category,
    estimated_value: parseFloat(formData.estimated_value),
    currency: formData.currency,
    submission_deadline: formData.submission_deadline,
    publication_date: formData.publication_date,
    status: 'published',
    espd_required: formData.espd_required,
    ted_published: formData.ted_published,
    created_by: user.id
  }])
```

### Routing
- **Side**: `/create`
- **Layout**: `/create/layout.tsx`
- **Authentication**: Kræver login

## 📱 Brugergrænseflade

### Header
- "← Tilbage til Udbud" knap
- "Opret Nyt Udbud" titel
- Beskrivende tekst

### Formular Felter
- **Titel**: Tekstfelt (påkrævet)
- **Enhed**: Tekstfelt (påkrævet)
- **Beskrivelse**: Textarea (påkrævet)
- **Kategori**: Dropdown (påkrævet)
- **Estimeret Værdi**: Number input (påkrævet)
- **Valuta**: Dropdown (DKK som standard)
- **Publiceringsdato**: Date input (påkrævet)
- **Deadline**: Date input (påkrævet)
- **ESPD påkrævet**: Checkbox (valgfrit)
- **TED publiceret**: Checkbox (valgfrit)

### Success State
- ✅ "Udbud Oprettet!" besked
- Knapper til at se alle udbud eller oprette nyt
- Automatisk redirect efter 2 sekunder

## 🎯 Brugerscenarier

1. **Bruger besøger /create**
   - Tjekker authentication
   - Viser formular hvis logget ind
   - Redirect til login hvis ikke

2. **Udfylder formular**
   - Real-time validering
   - Fejlbeskeder vises øjeblikkeligt
   - Loading state under submission

3. **Succesfuld oprettelse**
   - Viser success besked
   - Redirect til /tenders
   - Mulighed for at oprette nyt udbud

4. **Fejl håndtering**
   - Viser specifikke fejlbeskeder
   - Supabase fejl vises brugervenligt
   - Mulighed for at prøve igen

## 🔐 Authentication

- Side er beskyttet af authentication check
- Kræver login for at oprette udbud
- Automatisk redirect til `/login` hvis ikke logget ind
- `created_by` sættes automatisk til brugerens ID

## 📊 Performance

- Client-side rendering for interaktivitet
- Real-time form validation
- Optimized re-renders med useState
- Responsive design for alle enheder

## 🚀 Næste Skridt

### 1. Avancerede Felter
- Fil upload til dokumenter
- Rich text editor til beskrivelse
- Auto-save funktionalitet

### 2. Draft System
- Gem som kladde
- Rediger eksisterende udbud
- Version history

### 3. Validering
- Mere avanceret dato validering
- CVR nummer validering
- Email validering

### 4. Integration
- Auto-fill fra bruger profil
- Template system
- Bulk import

## 📝 Database Schema

### Tenders Table Insert
```sql
INSERT INTO tenders (
  title,
  description,
  entity_id,
  category,
  estimated_value,
  currency,
  submission_deadline,
  publication_date,
  status,
  espd_required,
  ted_published,
  created_by
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, 'published', $9, $10, $11
)
```

### Form Data Structure
```typescript
interface FormData {
  title: string
  description: string
  entity_id: string
  category: string
  estimated_value: string
  currency: string
  submission_deadline: string
  publication_date: string
  espd_required: boolean
  ted_published: boolean
}
```

### Validation Rules
- **Titel**: Påkrævet, ikke tom
- **Beskrivelse**: Påkrævet, ikke tom
- **Enhed**: Påkrævet, ikke tom
- **Kategori**: Påkrævet, fra dropdown
- **Estimeret Værdi**: Påkrævet, positivt tal
- **Deadline**: Påkrævet, efter publiceringsdato
- **Publiceringsdato**: Påkrævet, gyldig dato

## 🎮 Minecraft Design Elements

### Formular Styling
- Blokagtige input felter
- Pixel font på alle labels
- Hover effekter på knapper
- Border styling der matcher Minecraft

### Responsive Grid
- **Mobile**: 1 kolonne
- **Tablet**: 2 kolonner
- **Desktop**: 3 kolonner hvor muligt

### Animationer
- Hover effekter på knapper
- Loading animationer
- Success state transitions 