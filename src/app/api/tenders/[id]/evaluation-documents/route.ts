import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getCurrentUser, assertTenderOwner } from '@/lib/authz'
import { json, badRequest, unauthorized, internal } from '@/lib/http'
import { sanitizeFileName } from '@/lib/storage'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/types'

export const runtime = 'nodejs'

type TendersUpdate = Database['public']['Tables']['tenders']['Update']

const EVALUATION_BUCKET = 'evaluation-documents'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']

function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Filen er for stor. Maksimal størrelse er 10MB.' }
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Kun PDF, XLS og XLSX filer er tilladt.' }
  }

  return { valid: true }
}

function generateStoragePath(tenderId: string, fileName: string): string {
  const timestamp = Date.now()
  const randomId = randomUUID().slice(0, 8)
  const extension = fileName.split('.').pop()
  const safeName = sanitizeFileName(fileName.replace(/\.[^/.]+$/, ''))
  return `tenders/${tenderId}/evaluation/${timestamp}_${randomId}_${safeName}.${extension}`
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    if (!(await assertTenderOwner(user.id, params.id))) {
      return json(
        { error: 'Du har ikke tilladelse til at uploade evalueringsdokumenter til dette udbud' },
        403
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return badRequest('Ingen filer valgt')
    }

    const supabase = createServiceClient()
    const uploadedPaths: string[] = []

    // Upload each file
    for (const file of files) {
      const validation = validateFile(file)
      if (!validation.valid) {
        return badRequest(validation.error || 'Ugyldig fil')
      }

      const storagePath = generateStoragePath(params.id, file.name)
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      const { error: uploadError } = await supabase.storage
        .from(EVALUATION_BUCKET)
        .upload(storagePath, uint8Array, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        // Clean up already uploaded files
        if (uploadedPaths.length > 0) {
          await supabase.storage.from(EVALUATION_BUCKET).remove(uploadedPaths)
        }
        console.error('Error uploading file:', uploadError)
        return internal('Kunne ikke uploade fil')
      }

      uploadedPaths.push(storagePath)
    }

    // Get current evaluation_documents array
    const client = createClient()
    const { data: tender, error: fetchError } = await client
      .from('tenders')
      .select('evaluation_documents')
      .eq('id', params.id)
      .single()

    if (fetchError || !tender) {
      // Clean up uploaded files
      await supabase.storage.from(EVALUATION_BUCKET).remove(uploadedPaths)
      return internal('Kunne ikke hente udbud')
    }

    // Append new paths to existing array
    const currentDocs = tender.evaluation_documents || []
    const updatedDocs = [...currentDocs, ...uploadedPaths]

    // Update tender with new document paths
    const { error: updateError } = await client
      .from('tenders')
      .update<TendersUpdate>({ evaluation_documents: updatedDocs })
      .eq('id', params.id)

    if (updateError) {
      // Clean up uploaded files
      await supabase.storage.from(EVALUATION_BUCKET).remove(uploadedPaths)
      console.error('Error updating tender:', updateError)
      return internal('Kunne ikke opdatere udbud')
    }

    return json({
      ok: true,
      uploaded: uploadedPaths.length,
      paths: uploadedPaths,
    })
  } catch (error) {
    console.error('Error in POST /evaluation-documents:', error)
    return internal('Intern server fejl')
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    if (!(await assertTenderOwner(user.id, params.id))) {
      return json(
        { error: 'Du har ikke tilladelse til at se evalueringsdokumenter for dette udbud' },
        403
      )
    }

    const supabase = createClient()
    const { data: tender, error } = await supabase
      .from('tenders')
      .select('evaluation_documents')
      .eq('id', params.id)
      .single<{ evaluation_documents: string[] | null }>()

    if (error || !tender) {
      return json({ error: 'Udbud ikke fundet' }, 404)
    }

    // Generate signed URLs for each document
    const serviceClient = createServiceClient()
    const documents = await Promise.all(
      (tender.evaluation_documents || []).map(async (path: string) => {
        const { data } = await serviceClient.storage
          .from(EVALUATION_BUCKET)
          .createSignedUrl(path, 3600) // 1 hour expiry

        const fileName = path.split('/').pop() || path
        return {
          path,
          fileName,
          url: data?.signedUrl || null,
        }
      })
    )

    return json({ documents })
  } catch (error) {
    console.error('Error in GET /evaluation-documents:', error)
    return internal('Intern server fejl')
  }
}

