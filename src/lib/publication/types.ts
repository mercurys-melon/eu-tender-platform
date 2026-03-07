/**
 * Publication Engine Types
 * Types for udbud.dk publication integration
 */

export type PublicationJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying'

export interface PublicationJob {
  id: string
  tender_id: string
  status: PublicationJobStatus
  payload_version: number
  request_id: string | null
  payload: Record<string, any>
  response: Record<string, any> | null
  last_error: string | null
  attempts: number
  max_attempts: number
  next_retry_at: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface UdbudDKPayload {
  // Basic tender information
  title: string
  description: string
  category: string
  estimated_value: number
  currency: string
  submission_deadline: string
  publication_date: string
  
  // Optional fields
  prequalification_deadline?: string | null
  questions_deadline?: string | null
  
  // Entity information
  entity_id: string
  
  // Additional metadata
  espd_required: boolean
  status: string
}

export interface UdbudDKResponse {
  id?: string
  status: 'accepted' | 'rejected' | 'pending'
  message?: string
  errors?: Array<{
    field?: string
    message: string
  }>
  request_id?: string
}

export interface PublicationResult {
  success: boolean
  jobId: string
  status: PublicationJobStatus
  message?: string
  errors?: Array<{
    field?: string
    message: string
  }>
  requestId?: string
}

export interface PublicationError {
  field?: string
  message: string
  code?: string
}
