import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, assertTenderOwner } from '@/lib/authz'
import { createSignedUrl, createSignedUploadUrl, deleteFile, generateStoragePath } from '@/lib/storage/server'
import { z } from 'zod'
import { json, badRequest, unauthorized, internal } from '@/lib/http'
import type { Database } from '@/lib/supabase/types'

type TenderDocumentRow = Database['public']['Tables']['tender_documents']['Row']

const documentMetaSchema = z.object({
  file_name: z.string().min(1).max(255),
  mime_type: z.string().min(1),
  size_bytes: z.number().positive(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('tender_documents')
      .select(`
        id,
        file_name,
        mime_type,
        size_bytes,
        storage_path,
        created_at
      `)
      .eq('tender_id', params.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching documents:', error)
      return internal('Kunne ikke hente dokumenter')
    }

    // Generate signed URLs for each document
    const documents = (data ?? []) as TenderDocumentRow[]

    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        try {
          const signedUrl = await createSignedUrl(doc.storage_path)
          return {
            id: doc.id,
            file_name: doc.file_name,
            mime_type: doc.mime_type,
            size_bytes: doc.size_bytes,
            signed_url: signedUrl,
            created_at: doc.created_at,
          }
        } catch (error) {
          console.error(`Error generating signed URL for ${doc.id}:`, error)
          return {
            id: doc.id,
            file_name: doc.file_name,
            mime_type: doc.mime_type,
            size_bytes: doc.size_bytes,
            signed_url: null,
            created_at: doc.created_at,
          }
        }
      })
    )

    return json({ items: documentsWithUrls })
  } catch (error) {
    console.error('Error in GET /documents:', error)
    return internal('Intern server fejl')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const user = await getCurrentUser()

    if (!user) {
      return unauthorized()
    }

    // Check if user is tender owner
    const isOwner = await assertTenderOwner(user.id, params.id)
    if (!isOwner) {
      return json(
        { error: 'Du har ikke tilladelse til at uploade dokumenter til dette udbud' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = documentMetaSchema.parse(body)

    // Rate limiting check for document uploads (max 10 per day)
    const { count } = await supabase
      .from('tender_documents')
      .select('id', { count: 'exact', head: true })
      .eq('tender_id', params.id)
      .eq('created_by', user.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const uploadsThisPeriod = count || 0
    const remainingUploads = Math.max(0, 10 - uploadsThisPeriod)

    if (uploadsThisPeriod >= 10) {
      return json(
        { error: 'Du kan maksimalt uploade 10 dokumenter per dag' },
        { 
          status: 429, 
          headers: { 
            'X-RateLimit-Limit': '10', 
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          } 
        }
      )
    }

    // Generate storage path
    const storagePath = await generateStoragePath(params.id, validatedData.file_name)

    // Create signed upload URL
    const uploadData = await createSignedUploadUrl(storagePath)

    // Save document metadata to database
    const { data: docData, error: dbError } = await supabase
      .from('tender_documents')
      .insert({
        tender_id: params.id,
        storage_path: storagePath,
        file_name: validatedData.file_name,
        mime_type: validatedData.mime_type,
        size_bytes: validatedData.size_bytes,
        created_by: user.id,
      })
      .select('id')
      .single<Pick<TenderDocumentRow, 'id'>>()

    if (dbError) {
      console.error('Error saving document metadata:', dbError)
      return internal('Kunne ikke gemme dokument information')
    }

    if (!docData) {
      return internal('Kunne ikke gemme dokument information')
    }

    return json({
      id: docData.id,
      upload_url: uploadData.signedUrl,
      storage_path: storagePath,
    }, {
      headers: { 
        'X-RateLimit-Limit': '10', 
        'X-RateLimit-Remaining': Math.max(0, remainingUploads - 1).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest('Ugyldig data')
    }

    console.error('Error in POST /documents:', error)
    return internal('Intern server fejl')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const user = await getCurrentUser()
    
    if (!user) {
      return unauthorized()
    }

    // Check if user is tender owner
    const isOwner = await assertTenderOwner(user.id, params.id)
    if (!isOwner) {
      return json(
        { error: 'Du har ikke tilladelse til at slette dokumenter fra dette udbud' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return badRequest('Dokument ID er påkrævet')
    }

    // Get document info
    const { data: document, error: fetchError } = await supabase
      .from('tender_documents')
      .select('storage_path')
      .eq('id', documentId)
      .eq('tender_id', params.id)
      .single<Pick<TenderDocumentRow, 'storage_path'>>()

    if (fetchError || !document) {
      return json(
        { error: 'Dokument ikke fundet' },
        { status: 404 }
      )
    }

    // Delete from storage
    try {
      await deleteFile(document.storage_path)
    } catch (storageError) {
      console.error('Error deleting from storage:', storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('tender_documents')
      .delete()
      .eq('id', documentId)
      .eq('tender_id', params.id)

    if (deleteError) {
      console.error('Error deleting from database:', deleteError)
      return internal('Kunne ikke slette dokument')
    }

    return json({ ok: true })
  } catch (error) {
    console.error('Error in DELETE /documents:', error)
    return internal('Intern server fejl')
  }
}
