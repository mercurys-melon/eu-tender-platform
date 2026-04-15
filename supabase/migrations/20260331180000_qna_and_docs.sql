-- Q&A and Documents Migration
-- Adds tender_questions and tender_documents tables with RLS policies

-- ── tender_questions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tender_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  asked_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  question_text text NOT NULL,
  question_text_public text NOT NULL DEFAULT '',
  answer_text text NULL,
  is_published boolean NOT NULL DEFAULT false,
  is_anonymized boolean NOT NULL DEFAULT true,
  contact_email text NULL,
  contact_name text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── tender_documents ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tender_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tender_questions_tender_id ON public.tender_questions(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_questions_published  ON public.tender_questions(is_published);
CREATE INDEX IF NOT EXISTS idx_tender_questions_asked_by   ON public.tender_questions(asked_by);

CREATE INDEX IF NOT EXISTS idx_tender_documents_tender_id  ON public.tender_documents(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_documents_created_by ON public.tender_documents(created_by);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.tender_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_documents  ENABLE ROW LEVEL SECURITY;

-- tender_questions policies
DROP POLICY IF EXISTS "read_published_qna"           ON public.tender_questions;
DROP POLICY IF EXISTS "ask_question_any_authenticated" ON public.tender_questions;
DROP POLICY IF EXISTS "owner_manage_qna"             ON public.tender_questions;

CREATE POLICY "read_published_qna"
ON public.tender_questions
FOR SELECT
USING (is_published = true);

CREATE POLICY "ask_question_any_authenticated"
ON public.tender_questions
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "owner_manage_qna"
ON public.tender_questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenders t
    WHERE t.id = tender_questions.tender_id
      AND t.entity_id = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenders t
    WHERE t.id = tender_questions.tender_id
      AND t.entity_id = auth.uid()::text
  )
);

-- tender_documents policies
DROP POLICY IF EXISTS "read_docs_public_or_signed" ON public.tender_documents;
DROP POLICY IF EXISTS "owner_manage_docs"          ON public.tender_documents;

CREATE POLICY "read_docs_public_or_signed"
ON public.tender_documents
FOR SELECT
USING (true);

CREATE POLICY "owner_manage_docs"
ON public.tender_documents
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenders t
    WHERE t.id = tender_documents.tender_id
      AND t.entity_id = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenders t
    WHERE t.id = tender_documents.tender_id
      AND t.entity_id = auth.uid()::text
  )
);

-- ── Storage bucket ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('tender-docs', 'tender-docs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "tender_docs_owner_access" ON storage.objects;

CREATE POLICY "tender_docs_owner_access"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'tender-docs' AND
  EXISTS (
    SELECT 1 FROM public.tenders t
    WHERE t.id::text = (storage.foldername(name))[1]
      AND t.entity_id = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'tender-docs' AND
  EXISTS (
    SELECT 1 FROM public.tenders t
    WHERE t.id::text = (storage.foldername(name))[1]
      AND t.entity_id = auth.uid()::text
  )
);

-- ── updated_at trigger ────────────────────────────────────────────────────────
-- Ensure the trigger function exists (created in initial schema, but guard here)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tender_questions_updated_at ON public.tender_questions;
CREATE TRIGGER update_tender_questions_updated_at
  BEFORE UPDATE ON public.tender_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
