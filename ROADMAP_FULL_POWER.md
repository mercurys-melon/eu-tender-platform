# Roadmap: "Full Power" BlockBid Platform

Dette dokument beskriver planlagte features og moduler for at bringe BlockBid fra et solidt MVP til et komplet udbudsværktøj på niveau med iBinder/Mercell/Byggeweb.

---

## 🎯 Overordnet Mål

Skabe et komplet udbudssystem med:
- Professionelle buyer/supplier workflows
- EU-compliance (TED, ESPD, eForms)
- Effektiv evaluerings- og tildelingsprocess
- Post-award kontraktstyring
- Intuitiv, moderne UI

---

## 📋 Moduler og Features

### 1. Evalueringsmodul

**Scoringsmatrix & Vægtning**
- Konfigurerbar evalueringsmatrix pr. udbud
- Vægtning af kriterier (pris, kvalitet, leveringstid, etc.)
- Multi-kriterie evaluering (MCE)
- Automatisk scoring baseret på formler
- Manual override muligheder

**Flere Evaluatører**
- Team-baseret evaluering
- Delegation af evalueringsansvar
- Consensus-building værktøjer
- Evaluator notes og kommentarer
- Audit trail for alle evalueringer

**Integration Points:**
- Link til eksisterende evaluerings-logik i `lib/tenders/lifecycle.ts`
- Integration med bid- og participant-data

---

### 2. Notifikationssystem

**Email Notifikationer**
- Automatiske emails ved:
  - Nyt udbud offentliggjort
  - Deadline nærmer sig
  - Nyt spørgsmål/svar
  - Statusændringer
  - Tildelingsresultat
- Konfigurerbare notifikationspræferencer pr. bruger
- Email templates med BlockBid-branding

**In-App Notifikationer**
- Real-time notifikationer i UI
- Notification center/bell icon
- Mark as read/unread
- Kategorisering (urgent, info, reminder)
- Integration med existing `notifications` table

**Integration Points:**
- Supabase Realtime for instant updates
- Email service (SendGrid, Resend, eller Supabase Email)
- Existing notification infrastructure

---

### 3. Kontrakt-/Post-Award Modul

**Kontraktoprettelse**
- Generer kontrakter baseret på tender + vinder
- Kontrakt-templates
- Redigerbar kontrakttekst
- E-signatur integration (DocuSign, HelloSign)

**Kontraktstyring**
- Track kontraktstatus (udkast, signeret, aktiv, afsluttet)
- Milestone tracking
- Performance monitoring
- Invoice management
- Dokumentation af leverancer

**Integration Points:**
- Link til "awarded" tender status
- Integration med supplier-profiles
- Dokument-storage system

---

### 4. Bedre Multi-Lot Understøttelse

**UI Improvements**
- Visual lot-structure i tender details
- Lot-specific deadlines og kriterier
- Lot-based filtering og søgning
- Separate bids pr. lot
- Aggregated view med lot-breakdown

**Database Schema**
- Ensure `tenders` table supports lot-information
- Lot-specific bid tables eller JSON-struktur
- Lot-evaluation tracking

**Integration Points:**
- Update existing tender schema
- Modify bid-form til at support lot-selection
- Enhance TenderDetailsClient for lot-visualisering

---

### 5. UI-Flows for ESPD

**ESPD Oprettelse**
- GUI til at bygge ESPD-formularer
- Reusable ESPD-templates
- Dynamic form generation baseret på ESPD-schema
- Validation mod ESPD-standard

**ESPD Tilpasning**
- Customize ESPD for specifikt udbud
- Conditional fields baseret på tender-type
- Integration med ESPD-library

**Link til Tender**
- Associate ESPD med tender
- Auto-populate ESPD fra tender-data
- Supplier-side ESPD submission flow

**Integration Points:**
- Existing ESPD-modul i `lib/espd/`
- Integration med tender creation flow
- Supplier registration/profile flow

---

### 6. TED/eForms Publicering

**Status Tracking**
- Track TED-publiceringsstatus pr. tender
- Visual indicator (ikke publiceret, pending, publiceret)
- Link til TED-entry på TED-website

**eForms Integration**
- Generate eForms-compliant XML
- Validate mod eForms-schema
- Upload til TED via API (hvis muligt)
- Status-synkronisering

**Publicerings-workflow**
- One-click publicering til TED (efter validering)
- Preview af TED-entry før publicering
- Error-handling og retry-logik

**Integration Points:**
- Existing eForms-builder i `lib/eforms/`
- Integration med tender status lifecycle
- API integration til TED (hvis tilgængelig)

---

### 7. Udbud.dk Publicering

**Ikke Kun Søgning**
- Full integration til udbud.dk API
- Publicer udbud direkte til udbud.dk
- Auto-sync status mellem BlockBid og udbud.dk
- Import af eksisterende udbud fra udbud.dk

**Workflow**
- Prepare tender for udbud.dk
- Validate mod udbud.dk krav
- Submit til udbud.dk
- Track publicering-status
- Handle updates og corrections

**Integration Points:**
- Research udbud.dk API dokumentation
- Create adapter pattern (ligesom eForms/TED)
- Integration med tender creation/editing flow

---

## 🔗 Eksisterende Moduler der Skal Forbindes

### ESPD Modul (`lib/espd/`)
- **Status**: Grundlæggende struktur eksisterer
- **Mangler**: 
  - UI for ESPD creation/editing
  - Integration med tender creation
  - Supplier-side ESPD submission
- **Action Items**:
  - Build ESPD builder UI
  - Create ESPD template library
  - Integrate med tender workflow

### eForms Modul (`lib/eforms/`)
- **Status**: eForms builder eksisterer
- **Mangler**:
  - UI for eForms generation
  - TED API integration
  - Status tracking
- **Action Items**:
  - Create eForms generation UI
  - Build TED API client
  - Add status tracking til tenders

### Adapters (`lib/adapters/`)
- **Status**: Adapter patterns eksisterer
- **Mangler**:
  - Udbud.dk adapter
  - Full TED adapter
  - Status synkronisering
- **Action Items**:
  - Research og implementer udbud.dk adapter
  - Complete TED adapter med API calls
  - Build sync-mechanisms

---

## 📊 Prioritetering

### Phase 1: Core Enhancement (Q1)
1. ✅ Buyer dashboard improvements (DONE)
2. ✅ BlockBid UI refactoring (DONE)
3. ⏳ Evalueringsmodul (basic)
4. ⏳ Notifikationssystem (basic)

### Phase 2: EU-Compliance (Q2)
1. ESPD UI flows
2. TED/eForms publicering med status
3. Udbud.dk integration

### Phase 3: Advanced Features (Q3)
1. Post-award kontraktstyring
2. Multi-lot UI improvements
3. Advanced evaluering features

### Phase 4: Polish & Scale (Q4)
1. Performance optimization
2. Advanced analytics
3. Custom reporting
4. Mobile app (optional)

---

## 🛠️ Tekniske Overvejelser

### Database Schema Updates
- Add evaluerings-tables (scores, criteria, evaluators)
- Extend notifications table med kategorier
- Add kontrakt-tables
- Enhance lot-support i tenders table

### API Endpoints
- `/api/evaluations/*` - Evaluerings-endpoints
- `/api/notifications/*` - Notification management
- `/api/contracts/*` - Kontraktstyring
- `/api/integrations/udbuddk/*` - Udbud.dk integration

### Third-Party Integrations
- Email service (SendGrid/Resend)
- E-signature service (DocuSign/HelloSign)
- TED API (research required)
- Udbud.dk API (research required)

---

## 📝 Notes

- Alle features skal bevare BlockBid-branding
- Fokus på brugervenlighed og konsistens
- Incremental delivery - hver feature skal være brugbar isoleret
- Dokumentation og onboarding-materiale til hver feature

---

## 🎯 Success Metrics

- Buyer satisfaction: < 5 min fra oprettelse til publicering
- Supplier engagement: > 80% completion rate på ESPD
- EU compliance: 100% TED-publicering rate
- System performance: < 2s page load times
- User adoption: > 90% feature utilization

---

*Dette roadmap er levende dokument - opdateres løbende baseret på feedback og prioriteringer.*

