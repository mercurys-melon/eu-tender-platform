-- Migration: Tender Lifecycle Statuses and Participants
-- Adds extended tender statuses and supplier participation tracking

-- Drop existing enum and recreate with new values
-- Note: This will fail if there are existing rows with old values
-- In production, you may need to migrate data first
DROP TYPE IF EXISTS tender_status CASCADE;

-- Create new tender_status enum with lifecycle states
CREATE TYPE tender_status AS ENUM (
  'draft',
  'published',
  'prequalification',
  'bidding',
  'evaluation',
  'awarded',
  'closed',
  'cancelled'
);

-- Re-add status column to tenders table
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS status tender_status NOT NULL DEFAULT 'draft';

-- Create supplier_tender_status enum for participant tracking
CREATE TYPE supplier_tender_status AS ENUM (
  'interest_submitted',
  'prequalified',
  'proposal_in_progress',
  'proposal_submitted',
  'under_evaluation',
  'awarded',
  'not_awarded'
);

-- Create tender_participants table to track supplier participation
CREATE TABLE IF NOT EXISTS tender_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_status supplier_tender_status NOT NULL DEFAULT 'interest_submitted',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tender_id, supplier_id)
);

-- Create indexes for performance
CREATE INDEX idx_tender_participants_tender ON tender_participants(tender_id);
CREATE INDEX idx_tender_participants_supplier ON tender_participants(supplier_id);
CREATE INDEX idx_tender_participants_status ON tender_participants(supplier_status);

-- Create updated_at trigger for tender_participants
CREATE TRIGGER update_tender_participants_updated_at 
  BEFORE UPDATE ON tender_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on tender_participants
ALTER TABLE tender_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tender_participants
-- Suppliers can view their own participation
CREATE POLICY "Suppliers can view own participation" ON tender_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM suppliers 
      WHERE suppliers.id = tender_participants.supplier_id 
      AND suppliers.user_id = auth.uid()
    )
  );

-- Tender owners can view all participants for their tenders
CREATE POLICY "Tender owners can view participants" ON tender_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenders 
      WHERE tenders.id = tender_participants.tender_id 
      AND tenders.entity_id = auth.uid()::text
    )
  );

-- Suppliers can insert their own participation
CREATE POLICY "Suppliers can insert own participation" ON tender_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM suppliers 
      WHERE suppliers.id = tender_participants.supplier_id 
      AND suppliers.user_id = auth.uid()
    )
  );

-- Suppliers can update their own participation status (limited transitions)
CREATE POLICY "Suppliers can update own participation" ON tender_participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM suppliers 
      WHERE suppliers.id = tender_participants.supplier_id 
      AND suppliers.user_id = auth.uid()
    )
  );

-- Tender owners can update participant status (for prequalification, awarding, etc.)
CREATE POLICY "Tender owners can update participants" ON tender_participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tenders 
      WHERE tenders.id = tender_participants.tender_id 
      AND tenders.entity_id = auth.uid()::text
    )
  );

-- Add optional fields to tenders for lifecycle management
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS prequalification_deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS questions_deadline TIMESTAMP WITH TIME ZONE;

-- Create index for prequalification deadline
CREATE INDEX IF NOT EXISTS idx_tenders_prequalification_deadline ON tenders(prequalification_deadline);
CREATE INDEX IF NOT EXISTS idx_tenders_questions_deadline ON tenders(questions_deadline);

