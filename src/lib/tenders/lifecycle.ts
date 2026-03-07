import type { TenderStatus, SupplierTenderStatus } from './types'

/**
 * Valid transitions for tender status (buyer perspective)
 * Returns true if transition from 'from' to 'to' is allowed
 */
export function canTransitionTenderStatus(
  from: TenderStatus,
  to: TenderStatus
): boolean {
  // Define valid transitions
  const validTransitions: Record<TenderStatus, TenderStatus[]> = {
    draft: ['published', 'cancelled'],
    published: ['prequalification', 'bidding', 'cancelled'],
    prequalification: ['bidding', 'cancelled'],
    bidding: ['evaluation', 'cancelled'],
    evaluation: ['awarded', 'cancelled'],
    awarded: ['closed'],
    closed: [], // Terminal state
    cancelled: [], // Terminal state
  }

  return validTransitions[from]?.includes(to) ?? false
}

/**
 * Get next possible statuses for a given tender status
 */
export function getNextTenderStatuses(current: TenderStatus): TenderStatus[] {
  const validTransitions: Record<TenderStatus, TenderStatus[]> = {
    draft: ['published', 'cancelled'],
    published: ['prequalification', 'bidding', 'cancelled'],
    prequalification: ['bidding', 'cancelled'],
    bidding: ['evaluation', 'cancelled'],
    evaluation: ['awarded', 'cancelled'],
    awarded: ['closed'],
    closed: [],
    cancelled: [],
  }

  return validTransitions[current] || []
}

/**
 * Valid transitions for supplier-tender status
 * Returns true if transition from 'from' to 'to' is allowed
 */
export function canTransitionSupplierStatus(
  from: SupplierTenderStatus,
  to: SupplierTenderStatus
): boolean {
  // Define valid transitions
  const validTransitions: Record<SupplierTenderStatus, SupplierTenderStatus[]> = {
    interest_submitted: ['prequalified', 'not_awarded'], // Buyer can prequalify or reject
    prequalified: ['proposal_in_progress', 'not_awarded'], // Supplier can start proposal or buyer can reject
    proposal_in_progress: ['proposal_submitted', 'not_awarded'], // Supplier submits or buyer rejects
    proposal_submitted: ['under_evaluation', 'not_awarded'], // Buyer starts evaluation or rejects
    under_evaluation: ['awarded', 'not_awarded'], // Buyer awards or rejects
    awarded: [], // Terminal state
    not_awarded: [], // Terminal state
  }

  return validTransitions[from]?.includes(to) ?? false
}

/**
 * Get next possible statuses for a given supplier-tender status
 */
export function getNextSupplierStatuses(
  current: SupplierTenderStatus
): SupplierTenderStatus[] {
  const validTransitions: Record<SupplierTenderStatus, SupplierTenderStatus[]> = {
    interest_submitted: ['prequalified', 'not_awarded'],
    prequalified: ['proposal_in_progress', 'not_awarded'],
    proposal_in_progress: ['proposal_submitted', 'not_awarded'],
    proposal_submitted: ['under_evaluation', 'not_awarded'],
    under_evaluation: ['awarded', 'not_awarded'],
    awarded: [],
    not_awarded: [],
  }

  return validTransitions[current] || []
}

/**
 * Check if a tender status is in an active state (not terminal)
 */
export function isTenderStatusActive(status: TenderStatus): boolean {
  return !['closed', 'cancelled'].includes(status)
}

/**
 * Check if a tender status allows supplier participation
 */
export function canSupplierParticipate(status: TenderStatus): boolean {
  return ['published', 'prequalification', 'bidding'].includes(status)
}

/**
 * Check if a tender status allows bidding
 */
export function canSupplierBid(status: TenderStatus): boolean {
  return ['bidding'].includes(status)
}

/**
 * Check if a supplier status allows proposal submission
 */
export function canSupplierSubmitProposal(status: SupplierTenderStatus): boolean {
  return ['prequalified', 'proposal_in_progress'].includes(status)
}

/**
 * Group tender statuses by lifecycle phase
 */
export function getTenderStatusGroup(status: TenderStatus): 'active' | 'awarded' | 'completed' {
  if (['draft', 'published', 'prequalification', 'bidding', 'evaluation'].includes(status)) {
    return 'active'
  }
  if (status === 'awarded') {
    return 'awarded'
  }
  return 'completed'
}

/**
 * Group supplier statuses by lifecycle phase
 */
export function getSupplierStatusGroup(
  status: SupplierTenderStatus
): 'discoverable' | 'active' | 'result' {
  if (['interest_submitted', 'prequalified', 'proposal_in_progress', 'proposal_submitted', 'under_evaluation'].includes(status)) {
    return 'active'
  }
  if (['awarded', 'not_awarded'].includes(status)) {
    return 'result'
  }
  return 'discoverable'
}

