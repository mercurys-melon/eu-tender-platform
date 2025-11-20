import { Buffer } from 'node:buffer'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertTenderOwner, getCurrentUser } from '@/lib/authz'
import { validateFile } from '@/lib/storage'
import { createSignedUrl, deleteFile, generateStoragePath, uploadDocument } from '@/lib/storage/server'
import { json, badRequest, unauthorized, internal } from '@/lib/http'
import type { Database } from '@/lib/supabase/types'

type TenderDocumentRow = Database['public']['Tables']['tender_documents']['Row']

export const runtime = 'nodejs'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    if (!(await assertTenderOwner(user.id, params.id))) {
      return json(
        { error: 'Du har ikke tilladelse til at uploade dokumenter til dette udbud' },
        403
      )
    }

    const formData = await request.formData()
    const fileEntry = formData.get('file')

    if (!(fileEntry instanceof File)) {
      return badRequest('Fil er påkrævet')
    }

    const validation = validateFile(fileEntry)
    if (!validation.valid) {
      return badRequest(validation.error || 'Ugyldig fil')
    }

    const supabase = createClient()
    const { count } = await supabase
      .from('tender_documents')
      .select('id', { count: 'exact', head: true })
      .eq('tender_id', params.id)
      .eq('created_by', user.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const uploadsThisPeriod = count || 0
    if (uploadsThisPeriod >= 10) {
      return json(
        { error: 'Du kan maksimalt uploade 10 dokumenter per dag' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
        }
      )
    }

    const storagePath = await generateStoragePath(params.id, fileEntry.name)
    const fileBuffer = Buffer.from(await fileEntry.arrayBuffer())

    await uploadDocument(storagePath, fileBuffer, fileEntry.type || 'application/octet-stream')

    const { data: docData, error: dbError } = await supabase
      .from('tender_documents')
      .insert({
        tender_id: params.id,
        storage_path: storagePath,
        file_name: fileEntry.name,
        mime_type: fileEntry.type,
        size_bytes: fileEntry.size,
        created_by: user.id,
      })
      .select('id, created_at')
      .single<Pick<TenderDocumentRow, 'id' | 'created_at'>>()

    if (dbError) {
      await deleteFile(storagePath).catch(() => undefined)
      console.error('Error saving document metadata:', dbError)
      return internal('Kunne ikke gemme dokument information')
    }

    if (!docData) {
      await deleteFile(storagePath).catch(() => undefined)
      return internal('Kunne ikke gemme dokument information')
    }

    const signedUrl = await createSignedUrl(storagePath)

    return json(
      {
        id: docData.id,
        file_name: fileEntry.name,
        mime_type: fileEntry.type,
        size_bytes: fileEntry.size,
        signed_url: signedUrl,
        created_at: docData.created_at,
      },
      {
        status: 201,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': Math.max(0, 9 - uploadsThisPeriod).toString(),
          'X-RateLimit-Reset': new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      }
    )
  } catch (error) {
    console.error('Error in POST /api/tenders/[id]/documents/upload:', error)
    return internal('Intern server fejl')
  }
}

