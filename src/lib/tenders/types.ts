/**
 * Tender status from buyer perspective
 */
export type TenderStatus =
  | 'draft'
  | 'published'
  | 'prequalification'
  | 'bidding'
  | 'evaluation'
  | 'awarded'
  | 'closed'
  | 'cancelled'

/**
 * Supplier-tender status from supplier perspective
 * Tracks supplier's participation in a specific tender
 */
export type SupplierTenderStatus =
  | 'interest_submitted'
  | 'prequalified'
  | 'proposal_in_progress'
  | 'proposal_submitted'
  | 'under_evaluation'
  | 'awarded'
  | 'not_awarded'

/**
 * Tender with extended information
 */
export interface Tender {
  id: string
  title: string
  description: string
  entity_id: string
  category: string
  estimated_value: number
  currency: string
  submission_deadline: string
  publication_date: string
  prequalification_deadline?: string | null
  questions_deadline?: string | null
  status: TenderStatus
  espd_required: boolean
  ted_published: boolean
  created_at: string
  updated_at: string
}

/**
 * Tender participant (supplier participation in a tender)
 */
export interface TenderParticipant {
  id: string
  tender_id: string
  supplier_id: string
  supplier_status: SupplierTenderStatus
  created_at: string
  updated_at: string
}

/**
 * Tender with participant count
 */
export interface TenderWithStats extends Tender {
  bids_count?: number
  participants_count?: number
}

/**
 * Upcoming deadline for a tender
 */
export interface UpcomingDeadline {
  tenderId: string
  tenderTitle: string
  type: 'submission' | 'prequalification' | 'questions'
  date: string // ISO string
  status: TenderStatus
}

