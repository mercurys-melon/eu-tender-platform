# Schema Updates Needed for Bid Form Enhancement

## Bids Table Current Structure

**Eksisterende schema (fra 001_initial_schema.sql):**
```sql
CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'DKK',
    documents TEXT[] DEFAULT '{}',
    espd_data JSONB,
    status bid_status NOT NULL DEFAULT 'submitted',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Route Match

API-routen (`/app/api/bids/route.ts`) matcher det eksisterende schema:
- ✅ Bruger `amount` (ikke `price`)
- ✅ Bruger `documents` (TEXT[]) til file paths
- ✅ Bruger `submitted_at` timestamp
- ✅ Status: 'submitted' (fra bid_status enum)

## Optional: Tilføj Comment Kolonne

Bid-formen har et comment-felt, men det gemmes **ikke** endnu, da kolonnen mangler. Hvis du vil supporte kommentarer:

### Migration SQL (optional):

```sql
-- Add comment column for bid comments/notes
ALTER TABLE bids ADD COLUMN IF NOT EXISTS comment TEXT;
```

**Efter migration:**
- Opdater API route til at inkludere `comment: comment || null` i insert-statement
- Kommentar-feltet i bid-formen vil så blive gemt

## Storage Bucket Setup

Opret storage bucket for bid-dokumenter:

```sql
-- Create storage bucket (run in Supabase dashboard SQL editor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('bid-documents', 'bid-documents', false);
```

**RLS Policies nødvendige:**
- Suppliers kan uploade deres egne bid-dokumenter
- Buyers kan se bid-dokumenter for deres tenders
- Set up via Supabase dashboard → Storage → Policies

## Final Bids Table Structure

**Nuværende struktur (uden comment):**
- `id` UUID
- `tender_id` UUID (FK)
- `supplier_id` UUID (FK)
- `amount` DECIMAL(15,2)
- `currency` VARCHAR(3)
- `documents` TEXT[]
- `espd_data` JSONB
- `status` bid_status
- `submitted_at` TIMESTAMP
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

**Med comment (efter optional migration):**
- ... alle ovenstående ...
- `comment` TEXT (nullable)

---

# Evaluation Module Schema Updates

## Migration: 005_evaluation_fields.sql

### 1. Extend bid_status enum

**SQL:**
```sql
-- Extend bid_status enum with new evaluation statuses
ALTER TYPE bid_status ADD VALUE IF NOT EXISTS 'under_evaluation';
ALTER TYPE bid_status ADD VALUE IF NOT EXISTS 'winner';
ALTER TYPE bid_status ADD VALUE IF NOT EXISTS 'not_awarded';
```

**Beskrivelse:**
- Tilføjer tre nye status-værdier til `bid_status` enum:
  - `under_evaluation`: Bud er under evaluering
  - `winner`: Bud er valgt som vinder
  - `not_awarded`: Bud er ikke tildelt (efter evaluering)
- Eksisterende værdier (`submitted`, `under_review`, `accepted`, `rejected`) bevares for bagudkompatibilitet

### 2. Add evaluation fields to tenders table

**SQL:**
```sql
ALTER TABLE tenders
  ADD COLUMN IF NOT EXISTS awarded_bid_id UUID REFERENCES bids(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evaluation_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS evaluation_completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS evaluation_notes TEXT,
  ADD COLUMN IF NOT EXISTS evaluation_documents TEXT[] DEFAULT '{}';
```

**Beskrivelse:**
- `awarded_bid_id`: Reference til det bud, der er valgt som vinder (FK til bids.id, ON DELETE SET NULL)
- `evaluation_started_at`: Tidspunkt for når evalueringen startede
- `evaluation_completed_at`: Tidspunkt for når evalueringen blev afsluttet
- `evaluation_notes`: Generelle evalueringsnoter på tender-niveau
- `evaluation_documents`: Array af storage-stier til evalueringsark (Excel/PDF)

### 3. Add evaluation_notes to bids table

**SQL:**
```sql
ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS evaluation_notes TEXT;
```

**Beskrivelse:**
- `evaluation_notes`: Korte evalueringsnoter per bud (kun synlige for buyer)

### 4. Indexes

**SQL:**
```sql
CREATE INDEX IF NOT EXISTS idx_tenders_awarded_bid ON tenders(awarded_bid_id);
CREATE INDEX IF NOT EXISTS idx_tenders_evaluation_documents ON tenders USING GIN(evaluation_documents);
```

**Beskrivelse:**
- Index på `awarded_bid_id` for hurtigere lookups
- GIN index på `evaluation_documents` array for array-queries

## Updated TypeScript Types

### Bids Table

```typescript
bids: {
  Row: {
    // ... existing fields ...
    status: 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'under_evaluation' | 'winner' | 'not_awarded'
    evaluation_notes: string | null
    // ... rest of fields ...
  }
}
```

### Tenders Table

```typescript
tenders: {
  Row: {
    // ... existing fields ...
    awarded_bid_id: string | null
    evaluation_started_at: string | null
    evaluation_completed_at: string | null
    evaluation_notes: string | null
    evaluation_documents: string[]
    // ... rest of fields ...
  }
}
```

## Storage Bucket for Evaluation Documents

**Opret bucket (hvis ikke eksisterer):**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('evaluation-documents', 'evaluation-documents', false)
ON CONFLICT (id) DO NOTHING;
```

**Storage path struktur:**
- `tenders/{tenderId}/evaluation/{randomId}.{ext}`

**RLS Policies:**
- Buyers (tender owners) kan uploade og se evalueringsdokumenter for deres tenders
- Suppliers kan IKKE se evalueringsdokumenter
