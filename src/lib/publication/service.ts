/**
 * Publication Service for udbud.dk
 * Håndterer publikationsjobs med retry-logik og idempotency.
 *
 * TODO (teknisk gæld, adresseres efter P1):
 * UdbudDKPayload returnerer flade JSON-felter, men ERST forventer eForms UBL XML
 * per openapi-udbud.yml og scripts/output/notice-payload.xml.
 * payload-builder.ts skal erstattes med en XML-generator der producerer korrekt
 * eForms-format (eforms-sdk-dk-1.13.0-1.3.0 eller nyere).
 */

import { getServiceClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/types'
import { Tender } from '@/lib/tenders/types'
import { buildUdbudDKPayload, validatePayload } from './payload-builder'
import { callUdbudDkApi, getActiveUdbudDkEnvironment } from './udbud-dk-client'
import { env } from '@/config/env'
import type {
  PublicationJob,
  PublicationJobStatus,
  PublicationResult,
  UdbudDKPayload,
  UdbudDKResponse,
} from './types'
import { randomUUID } from 'crypto'

const MAX_ATTEMPTS = 3
const INITIAL_RETRY_DELAY_MS = 1000
const MAX_RETRY_DELAY_MS = 10000

// Forventet response-form fra ERST API
interface UdbudDKApiResponseBody {
  id?: string
  message?: string
  request_id?: string
  errors?: Array<{ field?: string; message?: string } | string>
}

/**
 * Hent SDK-version fra env — påkrævet for at bygge det korrekte ERST API-path.
 * Format: eforms-sdk-dk-1.13.0-1.3.0 (se openapi-udbud.yml og git.erst.dk/udbud-dk/sdk).
 */
function getSdkVersion(): string {
  const sdkVersion = env.ted.sdkVersion
  if (!sdkVersion) {
    throw new Error(
      '[publication] EFORMS_SDK_VERSION er ikke sat. ' +
        'Eksempel: eforms-sdk-dk-1.13.0-1.3.0 — verificer aktuelt tag mod git.erst.dk/udbud-dk/sdk',
    )
  }
  return sdkVersion
}

/**
 * Beregn exponential backoff delay for retries
 */
function calculateRetryDelay(attempt: number): number {
  return Math.min(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1), MAX_RETRY_DELAY_MS)
}

/**
 * Opret nyt publikationsjob i databasen (outbox pattern)
 */
async function createPublicationJob(
  tenderId: string,
  payload: UdbudDKPayload,
  requestId: string,
): Promise<PublicationJob> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('publication_jobs')
    .insert({
      tender_id: tenderId,
      status: 'pending',
      payload_version: 1,
      request_id: requestId,
      payload: payload as unknown as Json,
      attempts: 0,
      max_attempts: MAX_ATTEMPTS,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to create publication job: ${error?.message ?? 'Unknown error'}`)
  }

  return data as PublicationJob
}

/**
 * Opdater status på publikationsjob
 */
async function updateJobStatus(
  jobId: string,
  updates: {
    status?: PublicationJobStatus
    response?: Json
    last_error?: string | null
    attempts?: number
    next_retry_at?: string | null
    completed_at?: string | null
  },
): Promise<void> {
  const supabase = getServiceClient()

  const { error } = await supabase.from('publication_jobs').update(updates).eq('id', jobId)

  if (error) {
    throw new Error(`Failed to update publication job: ${error.message}`)
  }
}

/**
 * Kald Udbud.dk publikations-API via den env-bevidste client.
 *
 * Endpoint per openapi-udbud.yml:
 *   POST /ekstern-data/bekendtgoerelse/v1/{sdkVersion}/publicer
 *
 * Mapper fetch-Response til UdbudDKResponse til brug i processPublicationAttempt.
 */
async function callUdbudDKAPI(
  payload: UdbudDKPayload,
  requestId: string,
): Promise<UdbudDKResponse> {
  const sdkVersion = getSdkVersion()

  const response = await callUdbudDkApi({
    path: `/ekstern-data/bekendtgoerelse/v1/${sdkVersion}/publicer`,
    method: 'POST',
    body: payload,
    idempotencyKey: requestId,
  })

  const data = (await response.json()) as UdbudDKApiResponseBody

  if (!response.ok) {
    const rawErrors = data.errors ?? []
    if (rawErrors.length > 0) {
      return {
        status: 'rejected',
        message: data.message ?? 'Valideringsfejl',
        errors: rawErrors.map((err) =>
          typeof err === 'string'
            ? { message: err }
            : { field: err.field, message: err.message ?? String(err) },
        ),
        request_id: requestId,
      }
    }
    return {
      status: 'rejected',
      message: data.message ?? `API fejl: ${response.status} ${response.statusText}`,
      errors: [{ message: data.message ?? `HTTP ${response.status}` }],
      request_id: requestId,
    }
  }

  return {
    status: 'accepted',
    id: data.id,
    message: data.message ?? 'Publikation accepteret',
    request_id: data.request_id ?? requestId,
  }
}

/**
 * Processér et enkelt publikationsforsøg
 */
async function processPublicationAttempt(
  job: PublicationJob,
  payload: UdbudDKPayload,
): Promise<{ success: boolean; response?: UdbudDKResponse; error?: string }> {
  try {
    const response = await callUdbudDKAPI(payload, job.request_id!)

    if (response.status === 'accepted') {
      await updateJobStatus(job.id, {
        status: 'completed',
        response: response as unknown as Json,
        last_error: null,
        completed_at: new Date().toISOString(),
      })
      return { success: true, response }
    } else {
      const errorMessage = response.message ?? 'Publikation blev afvist'
      await updateJobStatus(job.id, {
        status: 'failed',
        response: response as unknown as Json,
        last_error: errorMessage,
      })
      return { success: false, response, error: errorMessage }
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Netværksfejl ved publikation'
    const newAttempts = job.attempts + 1

    if (newAttempts >= job.max_attempts) {
      await updateJobStatus(job.id, {
        status: 'failed',
        last_error: errorMessage,
        attempts: newAttempts,
      })
      return { success: false, error: errorMessage }
    } else {
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
 * Publicer et udbud til udbud.dk
 */
export async function publishToUdbud(tenderId: string): Promise<PublicationResult> {
  console.log(`[publication] publishing tender=${tenderId} env=${getActiveUdbudDkEnvironment()}`)

  const supabase = getServiceClient()

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

  const payload = buildUdbudDKPayload(tender as Tender)

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

  const requestId = randomUUID()

  let job: PublicationJob
  try {
    job = await createPublicationJob(tenderId, payload, requestId)
  } catch (error: unknown) {
    return {
      success: false,
      jobId: '',
      status: 'failed',
      message: 'Kunne ikke oprette publikationsjob',
      errors: [{ message: error instanceof Error ? error.message : 'Ukendt fejl' }],
    }
  }

  await updateJobStatus(job.id, { status: 'processing' })

  const result = await processPublicationAttempt(job, payload)

  if (result.success && result.response) {
    return {
      success: true,
      jobId: job.id,
      status: 'completed',
      message: result.response.message ?? 'Publikation gennemført',
      requestId: result.response.request_id,
    }
  } else {
    const errors = result.response?.errors ?? [
      { message: result.error ?? 'Publikation fejlede' },
    ]
    return {
      success: false,
      jobId: job.id,
      status: job.attempts >= job.max_attempts ? 'failed' : 'retrying',
      message: result.error ?? 'Publikation fejlede',
      errors,
      requestId: job.request_id ?? undefined,
    }
  }
}

/**
 * Hent status på et enkelt publikationsjob
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
 * Hent alle publikationsjobs for et udbud, nyeste først
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
