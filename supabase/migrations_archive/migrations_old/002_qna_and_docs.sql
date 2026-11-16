-- Q&A and Documents Migration
-- Adds tender_questions and tender_documents tables with RLS policies

-- Questions & Answers table
CREATE TABLE IF NOT EXISTS public.tender_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  asked_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  question_text text NOT NULL,
  question_text_public text NOT NULL DEFAULT '', -- anonymiseret/redigeret version
  answer_text text NULL,
  is_published boolean NOT NULL DEFAULT false,
  is_anonymized boolean NOT NULL DEFAULT true,
  contact_email text NULL,
  contact_name text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Documents table
CREATE TABLE IF NOT EXISTS public.tender_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  storage_path text NOT NULL, -- bucket/key
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_tender_questions_tender_id ON public.tender_questions(tender_id);
CREATE INDEX idx_tender_questions_published ON public.tender_questions(is_published);
CREATE INDEX idx_tender_questions_asked_by ON public.tender_questions(asked_by);

CREATE INDEX idx_tender_documents_tender_id ON public.tender_documents(tender_id);
CREATE INDEX idx_tender_documents_created_by ON public.tender_documents(created_by);

-- Enable RLS
ALTER TABLE public.tender_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_documents ENABLE ROW LEVEL SECURITY;

-- Q&A Policies
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

-- Documents policies
CREATE POLICY "read_docs_public_or_signed"
ON public.tender_documents
FOR SELECT
USING (true); -- downloads styres via signed URLs i API

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

-- Create storage bucket for tender documents
INSERT INTO storage.buckets (id, name, public) VALUES 
('tender-docs', 'tender-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for tender-docs bucket
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

-- Add updated_at trigger for tender_questions
CREATE TRIGGER update_tender_questions_updated_at 
  BEFORE UPDATE ON public.tender_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
