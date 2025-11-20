# Q&A og Dokumenthåndtering Setup Guide

Denne guide beskriver implementeringen af Q&A og dokumenthåndtering funktionalitet for EU Tender Platform.

## 🚀 Funktioner

### Q&A System
- **Spørgsmål**: Ansøgere kan stille spørgsmål til udbud
- **Moderation**: Ordregivere kan redigere/anonymisere spørgsmål før publicering
- **Svar**: Ordregivere kan besvare spørgsmål og publicere dem
- **Anonymisering**: Spørgsmål kan anonymiseres for at beskytte spørgerens identitet

### Dokumenthåndtering
- **Upload**: Ordregivere kan uploade dokumenter til udbud
- **Sikre links**: Dokumenter er kun tilgængelige via signed URLs (6 timers gyldighed)
- **Organisering**: Dokumenter organiseres automatisk per udbud
- **Validering**: Filtyper og størrelse valideres ved upload

## 📁 Nye Filer

### Database Migration
- `supabase/migrations/002_qna_and_docs.sql` - Database tabeller og RLS policies

### API Routes
- `src/app/api/tenders/[id]/questions/route.ts` - Q&A CRUD operationer
- `src/app/api/tenders/[id]/questions/[questionId]/moderate/route.ts` - Q&A moderation
- `src/app/api/tenders/[id]/documents/route.ts` - Dokument upload/download/slet

### Komponenter
- `src/components/tenders/TenderDetailsHeader.tsx` - Forbedret header med CTA'er
- `src/components/tenders/QnAList.tsx` - Viser publicerede spørgsmål og svar
- `src/components/tenders/AskQuestionForm.tsx` - Formular til at stille spørgsmål
- `src/components/tenders/QnAModerationPanel.tsx` - Moderation interface
- `src/components/tenders/DocumentsList.tsx` - Dokument liste med download
- `src/components/tenders/DocumentsUploader.tsx` - Upload interface med drag-and-drop

### Utility Libraries
- `src/lib/supabase/server.ts` - Server-side Supabase klient
- `src/lib/authz.ts` - Authorization helpers
- `src/lib/storage.ts` - Storage utilities og validering

### Sider
- `src/app/tenders/[id]/page.tsx` - Opdateret detaljeside med Q&A og dokumenter
- `src/app/tenders/[id]/manage/page.tsx` - Ny administration side

## 🗄️ Database Schema

### tender_questions
```sql
- id (uuid, primary key)
- tender_id (uuid, foreign key)
- asked_by (uuid, foreign key to auth.users)
- question_text (text) - Originalt spørgsmål
- question_text_public (text) - Redigeret/anonymiseret version
- answer_text (text, nullable) - Svar fra ordregiver
- is_published (boolean) - Publiceringsstatus
- is_anonymized (boolean) - Anonymiseringsstatus
- contact_email (text, nullable) - Spørgers email
- contact_name (text, nullable) - Spørgers navn
- created_at, updated_at (timestamptz)
```

### tender_documents
```sql
- id (uuid, primary key)
- tender_id (uuid, foreign key)
- storage_path (text) - Supabase Storage path
- file_name (text) - Originalt filnavn
- mime_type (text) - MIME type
- size_bytes (bigint) - Filstørrelse
- is_public (boolean) - Synlighedsstatus
- created_by (uuid, foreign key to auth.users)
- created_at (timestamptz)
```

## 🔐 Sikkerhed

### RLS Policies
- **Q&A**: Kun publicerede spørgsmål er synlige for alle
- **Dokumenter**: Kun ejer kan uploade/slette, alle kan downloade via signed URLs
- **Moderation**: Kun tender ejer kan moderere spørgsmål

### Validering
- **Filtyper**: PDF, DOC, DOCX, XLS, XLSX, ZIP, TXT, JPG, PNG, GIF
- **Størrelse**: Konfigurerbar maksimal filstørrelse
- **Rate limiting**: 5 spørgsmål per dag per bruger
- **Input sanitization**: HTML fjernes fra alle tekstfelter

## ⚙️ Konfiguration

### Environment Variables
```env
# Eksisterende
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Nye
NEXT_PUBLIC_MAX_UPLOAD_MB=10
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Supabase Storage
- Bucket: `tender-docs` (privat)
- RLS policies for sikker adgang
- Signed URLs med 6 timers gyldighed

## 🚀 Installation

1. **Kør database migration**:
   ```bash
   supabase db push
   ```

2. **Opret storage bucket** (hvis ikke automatisk):
   ```sql
   INSERT INTO storage.buckets (id, name, public) 
   VALUES ('tender-docs', 'tender-docs', false);
   ```

3. **Sæt environment variables** i `.env.local`

4. **Start udviklingsserver**:
   ```bash
   npm run dev
   ```

## 📱 Brugergrænseflade

### Offentlig Tender Side (`/tenders/[id]`)
- **Header**: Tender detaljer med "Administrer udbud" knap for ejere
- **Dokumenter**: Liste med download links
- **Q&A**: Publicerede spørgsmål og svar
- **Spørgsmål formular**: For autentificerede brugere
- **Bud formular**: Eksisterende funktionalitet

### Administration Side (`/tenders/[id]/manage`)
- **Q&A Tab**: Moderation af spørgsmål
  - Upublicerede spørgsmål med redigeringsmuligheder
  - Publicerede spørgsmål med afpubliceringsmuligheder
  - Anonymisering og svar funktionalitet
- **Dokumenter Tab**: Upload og administration
  - Drag-and-drop upload
  - Dokument liste med sletning
  - Progress tracking

## 🔄 API Endpoints

### Q&A
- `POST /api/tenders/[id]/questions` - Opret spørgsmål
- `GET /api/tenders/[id]/questions` - Hent spørgsmål (publicerede)
- `PATCH /api/tenders/[id]/questions/[questionId]/moderate` - Moderere spørgsmål

### Dokumenter
- `GET /api/tenders/[id]/documents` - Hent dokumenter med signed URLs
- `POST /api/tenders/[id]/documents` - Opret upload URL
- `DELETE /api/tenders/[id]/documents?id=...` - Slet dokument

## 🧪 Test

### Q&A Flow
1. Log ind som ansøger
2. Gå til tender detaljeside
3. Stil et spørgsmål
4. Log ind som tender ejer
5. Gå til administration side
6. Moderere og besvar spørgsmål
7. Publicer spørgsmål
8. Verificer at spørgsmål vises på offentlig side

### Dokument Flow
1. Log ind som tender ejer
2. Gå til administration side
3. Upload dokument
4. Verificer at dokument vises i listen
5. Test download via signed URL
6. Slet dokument og verificer fjernelse

## 🐛 Fejlfinding

### Almindelige Problemer
- **Upload fejler**: Tjek storage bucket eksisterer og RLS policies
- **Signed URLs virker ikke**: Tjek service role key og bucket permissions
- **Moderation virker ikke**: Tjek at bruger er tender ejer (entity_id match)
- **RLS blokerer**: Tjek policies og bruger roller

### Debug Tips
- Tjek browser console for fejl
- Verificer Supabase logs
- Test API endpoints direkte med Postman/curl
- Kontroller environment variables

## 🔮 Fremtidige Forbedringer

- **E-mail notifikationer**: Ved nye spørgsmål og publicering
- **Bulk operationer**: Masseredigering af spørgsmål
- **Avancerede filtyper**: Flere dokumentformater
- **Versionering**: Dokument versionering
- **Søgning**: Søg i spørgsmål og dokumenter
- **Export**: Export af Q&A til PDF
- **Audit log**: Detaljeret logging af moderation handlinger
