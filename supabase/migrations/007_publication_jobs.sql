-- Migration: Publication Jobs for udbud.dk integration
-- Implements outbox pattern for reliable publication to external API

-- Create publication_job_status enum
CREATE TYPE publication_job_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'retrying'
);

-- Create publication_jobs table
CREATE TABLE IF NOT EXISTS publication_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  status publication_job_status NOT NULL DEFAULT 'pending',
  payload_version INTEGER NOT NULL DEFAULT 1,
  request_id TEXT UNIQUE, -- idempotency_key for udbud.dk API
  payload JSONB NOT NULL,
  response JSONB,
  last_error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX idx_publication_jobs_tender ON publication_jobs(tender_id);
CREATE INDEX idx_publication_jobs_status ON publication_jobs(status);
CREATE INDEX idx_publication_jobs_request_id ON publication_jobs(request_id);
CREATE INDEX idx_publication_jobs_next_retry ON publication_jobs(next_retry_at) WHERE status = 'retrying';

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger for publication_jobs
CREATE TRIGGER update_publication_jobs_updated_at 
  BEFORE UPDATE ON publication_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on publication_jobs
ALTER TABLE publication_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for publication_jobs
-- Tender owners can view publication jobs for their tenders
CREATE POLICY "Tender owners can view publication jobs" ON publication_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenders 
      WHERE tenders.id = publication_jobs.tender_id 
      AND tenders.entity_id = auth.uid()::text
    )
  );

-- Tender owners can insert publication jobs for their tenders
CREATE POLICY "Tender owners can insert publication jobs" ON publication_jobs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenders 
      WHERE tenders.id = publication_jobs.tender_id 
      AND tenders.entity_id = auth.uid()::text
    )
  );

-- Tender owners can update publication jobs for their tenders
CREATE POLICY "Tender owners can update publication jobs" ON publication_jobs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tenders 
      WHERE tenders.id = publication_jobs.tender_id 
      AND tenders.entity_id = auth.uid()::text
    )
  );
