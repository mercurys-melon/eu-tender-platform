export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server'
import { uploadBufferToTenderBucket, signUrl, STORAGE_BUCKET } from '@/lib/storage/server'
import { validateFile } from '@/lib/storage'
import { getCurrentUser, getManagedTender } from '@/lib/authz'
import { logAction } from '@/lib/audit'
import type { Database } from '@/lib/supabase/types'

type TD_Insert = Database['public']['Tables']['tender_documents']['Insert']

/**
 * POST /api/tenders/[id]/documents/upload — upload udbudsmateriale.
 *
 * Ejerskab verificeres FØR storage-upload, fordi uploaden sker med service-role.
 * Kun mens udbuddet er i kladde; senere ændringer er rettelser (fase 2).
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const tender = await getManagedTender(user.id, params.id)
  if (!tender) return NextResponse.json({ error: 'Ingen adgang' }, { status: 403 })
  if (tender.status !== 'draft') {
    return NextResponse.json(
      { error: 'Materiale kan kun tilføjes, mens udbuddet er i kladde' },
      { status: 409 },
    )
  }

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Ugyldig formular' }, { status: 400 })
  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Fil mangler' }, { status: 400 })
  }
  const validation = validateFile(file)
  if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 })

  const mimeType = file.type || 'application/octet-stream'
  const storage_path = await uploadBufferToTenderBucket(
    params.id,
    file.name,
    mimeType,
    Buffer.from(await file.arrayBuffer()),
  )

  const payload: TD_Insert = {
    tender_id: params.id,
    storage_path,
    file_name: file.name,
    mime_type: mimeType,
    size_bytes: file.size,
    // Udbudsmateriale bliver offentligt, når udbuddet publiceres
    is_public: true,
    created_by: user.id,
  }

  const db = getServiceClient()
  const { data, error } = await db.from('tender_documents').insert(payload).select('*').single()
  if (error || !data) {
    await db.storage.from(STORAGE_BUCKET).remove([storage_path]).catch(() => undefined)
    console.error('[documents/upload] insert fejlede:', error?.code, error?.message)
    return NextResponse.json({ error: 'Kunne ikke gemme dokument' }, { status: 500 })
  }

  const signed_url = await signUrl(storage_path)
  await logAction(user.id, 'document.uploaded', 'tender', params.id, {
    file_name: file.name,
    size_bytes: file.size,
  })
  return NextResponse.json({ ...data, signed_url }, { status: 201 })
}
