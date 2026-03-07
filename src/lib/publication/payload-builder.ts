/**
 * Payload Builder for udbud.dk API
 * Transforms internal tender data to udbud.dk format
 */

import { Tender } from '@/lib/tenders/types'
import { UdbudDKPayload } from './types'

/**
 * Builds payload for udbud.dk API from tender data
 */
export function buildUdbudDKPayload(tender: Tender): UdbudDKPayload {
  return {
    title: tender.title,
    description: tender.description,
    category: tender.category,
    estimated_value: tender.estimated_value,
    currency: tender.currency,
    submission_deadline: tender.submission_deadline,
    publication_date: tender.publication_date,
    prequalification_deadline: tender.prequalification_deadline || null,
    questions_deadline: tender.questions_deadline || null,
    entity_id: tender.entity_id,
    espd_required: tender.espd_required,
    status: tender.status,
  }
}

/**
 * Validates payload before sending to udbud.dk
 * Returns array of field errors if validation fails
 */
export function validatePayload(payload: UdbudDKPayload): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = []

  if (!payload.title || payload.title.trim().length < 10) {
    errors.push({
      field: 'title',
      message: 'Titel skal være mindst 10 tegn',
    })
  }

  if (!payload.description || payload.description.trim().length < 50) {
    errors.push({
      field: 'description',
      message: 'Beskrivelse skal være mindst 50 tegn',
    })
  }

  if (!payload.category) {
    errors.push({
      field: 'category',
      message: 'Kategori er påkrævet',
    })
  }

  if (!payload.estimated_value || payload.estimated_value <= 0) {
    errors.push({
      field: 'estimated_value',
      message: 'Værdi skal være positiv',
    })
  }

  if (!payload.currency || payload.currency.length !== 3) {
    errors.push({
      field: 'currency',
      message: 'Valuta skal være 3 tegn (fx DKK)',
    })
  }

  if (!payload.submission_deadline) {
    errors.push({
      field: 'submission_deadline',
      message: 'Deadline er påkrævet',
    })
  } else {
    const deadline = new Date(payload.submission_deadline)
    if (isNaN(deadline.getTime())) {
      errors.push({
        field: 'submission_deadline',
        message: 'Ugyldig deadline dato',
      })
    } else if (deadline <= new Date()) {
      errors.push({
        field: 'submission_deadline',
        message: 'Deadline skal være i fremtiden',
      })
    }
  }

  if (!payload.publication_date) {
    errors.push({
      field: 'publication_date',
      message: 'Publikationsdato er påkrævet',
    })
  }

  if (!payload.entity_id) {
    errors.push({
      field: 'entity_id',
      message: 'Entity ID er påkrævet',
    })
  }

  return errors
}
