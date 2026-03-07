/**
 * Publication Service for udbud.dk
 * Handles publication jobs with retry logic and idempotency
 */

import { getServiceClient } from '@/lib/supabase/server'
import { Tender } from '@/lib/tenders/types'
import { buildUdbudDKPayload, validatePayload } from './payload-builder'
import type {
  PublicationJob,
  PublicationJobStatus,
  PublicationResult,
  UdbudDKResponse,
} from './types'
import { randomUUID } from 'crypto'

const UDBUD_DK_PREPROD_URL = process.env.UDBUD_DK_PREPROD_URL || 'https://preprod.udbud.dk/api/v1/publications'
const UDBUD_DK_API_KEY = process.env.UDBUD_DK_API_KEY || ''

const MAX_ATTEMPTS = 3
const INITIAL_RETRY_DELAY_MS = 1000 // 1 second
const MAX_RETRY_DELAY_MS = 10000 // 10 seconds

/**
 * Calculate exponential backoff delay for retries
 */
function calculateRetryDelay(attempt: number): number {
  const delay = Math.min(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1), MAX_RETRY_DELAY_MS)
  return delay
}

/**
 * Create a new publication job in the database (outbox pattern)
 */
async function createPublicationJob(
  tenderId: string,
  payload: Record<string, any>,
  requestId: string
): Promise<PublicationJob> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('publication_jobs')
    .insert({
      tender_id: tenderId,
      status: 'pending',
      payload_version: 1,
      request_id: requestId,
      payload,
      attempts: 0,
      max_attempts: MAX_ATTEMPTS,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to create publication job: ${error?.message || 'Unknown error'}`)
  }

  return data as PublicationJob
}

/**
 * Update publication job status
 */
async function updateJobStatus(
  jobId: string,
  updates: {
    status?: PublicationJobStatus
    response?: Record<string, any>
    last_error?: string | null
    attempts?: number
    next_retry_at?: string | null
    completed_at?: string | null
  }
): Promise<void> {
  const supabase = getServiceClient()

  const { error } = await supabase
    .from('publication_jobs')
    .update(updates)
    .eq('id', jobId)

  if (error) {
    throw new Error(`Failed to update publication job: ${error.message}`)
  }
}

/**
 * Call udbud.dk PREPROD API
 */
async function callUdbudDKAPI(
  payload: Record<string, any>,
  requestId: string
): Promise<UdbudDKResponse> {
  const response = await fetch(UDBUD_DK_PREPROD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${UDBUD_DK_API_KEY}`,
      'X-Idempotency-Key': requestId,
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (!response.ok) {
    // Try to extract field errors from response
    const errors = data.errors || []
    if (errors.length > 0) {
      return {
        status: 'rejected',
        message: data.message || 'Valideringsfejl',
        errors: errors.map((err: any) => ({
          field: err.field,
          message: err.message || err,
        })),
        request_id: requestId,
      }
    }

    return {
      status: 'rejected',
      message: data.message || `API fejl: ${response.status} ${response.statusText}`,
      errors: [{ message: data.message || `HTTP ${response.status}` }],
      request_id: requestId,
    }
  }

  return {
    status: 'accepted',
    id: data.id,
    message: data.message || 'Publikation accepteret',
    request_id: data.request_id || requestId,
  }
}

/**
 * Process a single publication attempt
 */
async function processPublicationAttempt(
  job: PublicationJob,
  payload: Record<string, any>
): Promise<{ success: boolean; response?: UdbudDKResponse; error?: string }> {
  try {
    const response = await callUdbudDKAPI(payload, job.request_id!)

    if (response.status === 'accepted') {
      await updateJobStatus(job.id, {
        status: 'completed',
        response,
        last_error: null,
        completed_at: new Date().toISOString(),
      })
      return { success: true, response }
    } else {
      // Rejected by API
      const errorMessage = response.message || 'Publikation blev afvist'
      await updateJobStatus(job.id, {
        status: 'failed',
        response,
        last_error: errorMessage,
      })
      return { success: false, response, error: errorMessage }
    }
  } catch (error: any) {
    // Network or other error
    const errorMessage = error.message || 'Netværksfejl ved publikation'
    const newAttempts = job.attempts + 1

    if (newAttempts >= job.max_attempts) {
      // Max attempts reached
      await updateJobStatus(job.id, {
        status: 'failed',
        last_error: errorMessage,
        attempts: newAttempts,
      })
      return { success: false, error: errorMessage }
    } else {
      // Schedule retry
      const retryDelay = calculateRetryDelay(newAttempts)
      const nextRetryAt = new Date(Date.now() + retryDelay).toISOString()

      await updateJobStatus(job.id, {
        status: 'retrying',
        last_error: errorMessage,
        attempts: newAttempts,
        next_retry_at: nextRetryAt,
      })
      return { success: false, error: errorMessage }
    }
  }
}

/**
 * Main function to publish a tender to udbud.dk
 */
export async function publishToUdbud(tenderId: string): Promise<PublicationResult> {
  const supabase = getServiceClient()

  // Fetch tender data
  const { data: tender, error: tenderError } = await supabase
    .from('tenders')
    .select('*')
    .eq('id', tenderId)
    .single()

  if (tenderError || !tender) {
    return {
      success: false,
      jobId: '',
      status: 'failed',
      message: 'Tender ikke fundet',
      errors: [{ message: 'Tender ikke fundet' }],
    }
  }

  // Build payload
  const payload = buildUdbudDKPayload(tender as Tender)

  // Validate payload
  const validationErrors = validatePayload(payload)
  if (validationErrors.length > 0) {
    return {
      success: false,
      jobId: '',
      status: 'failed',
      message: 'Valideringsfejl',
      errors: validationErrors,
    }
  }

  // Generate idempotency key
  const requestId = randomUUID()

  // Create job (outbox pattern)
  let job: PublicationJob
  try {
    job = await createPublicationJob(tenderId, payload, requestId)
  } catch (error: any) {
    return {
      success: false,
      jobId: '',
      status: 'failed',
      message: 'Kunne ikke oprette publikationsjob',
      errors: [{ message: error.message || 'Ukendt fejl' }],
    }
  }

  // Update status to processing
  await updateJobStatus(job.id, { status: 'processing' })

  // Process publication attempt
  const result = await processPublicationAttempt(job, payload)

  if (result.success && result.response) {
    return {
      success: true,
      jobId: job.id,
      status: 'completed',
      message: result.response.message || 'Publikation gennemført',
      requestId: result.response.request_id,
    }
  } else {
    // Extract errors from response if available
    const errors = result.response?.errors || [{ message: result.error || 'Publikation fejlede' }]

    return {
      success: false,
      jobId: job.id,
      status: job.attempts >= job.max_attempts ? 'failed' : 'retrying',
      message: result.error || 'Publikation fejlede',
      errors,
      requestId: job.request_id || undefined,
    }
  }
}

/**
 * Get publication job status
 */
export async function getPublicationJobStatus(jobId: string): Promise<PublicationJob | null> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('publication_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error || !data) {
    return null
  }

  return data as PublicationJob
}

/**
 * Get publication jobs for a tender
 */
export async function getTenderPublicationJobs(tenderId: string): Promise<PublicationJob[]> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('publication_jobs')
    .select('*')
    .eq('tender_id', tenderId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    return []
  }

  return data as PublicationJob[]
}
