-- Migration: Add evaluation fields to tenders and extend bid_status enum
-- This migration adds evaluation functionality for buyers to evaluate bids

-- 1. Extend bid_status enum with new evaluation statuses
-- Note: PostgreSQL doesn't support removing enum values, so we add new ones
-- The old values ('submitted', 'under_review', 'accepted', 'rejected') are kept for backwards compatibility
ALTER TYPE bid_status ADD VALUE IF NOT EXISTS 'under_evaluation';
ALTER TYPE bid_status ADD VALUE IF NOT EXISTS 'winner';
ALTER TYPE bid_status ADD VALUE IF NOT EXISTS 'not_awarded';

-- 2. Add evaluation fields to tenders table
ALTER TABLE tenders
  ADD COLUMN IF NOT EXISTS awarded_bid_id UUID REFERENCES bids(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evaluation_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS evaluation_completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS evaluation_notes TEXT,
  ADD COLUMN IF NOT EXISTS evaluation_documents TEXT[] DEFAULT '{}';

-- 3. Add evaluation_notes to bids table (per-bid evaluation notes)
ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS evaluation_notes TEXT;

-- 4. Add index on awarded_bid_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenders_awarded_bid ON tenders(awarded_bid_id);

-- 5. Add index on evaluation_documents for array queries (if needed)
CREATE INDEX IF NOT EXISTS idx_tenders_evaluation_documents ON tenders USING GIN(evaluation_documents);

-- Note: RLS policies for tenders already allow tender owners (entity_id) to update their tenders
-- The evaluation fields will be automatically covered by existing policies

