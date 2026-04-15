export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import { uploadBufferToTenderBucket, signUrl } from '@/lib/storage/server'
import type { Database } from '@/lib/supabase/types'
import { logAction } from '@/lib/audit'
type TD_Insert = Database['public']['Tables']['tender_documents']['Insert']
type TD_Row = Database['public']['Tables']['tender_documents']['Row']
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })
  const ab = await file.arrayBuffer()
  const storage_path = await uploadBufferToTenderBucket(
    params.id, file.name, file.type || 'application/octet-stream', Buffer.from(ab)
  )
  const payload: TD_Insert = {
    tender_id: params.id,
    storage_path,
    file_name: file.name,
    mime_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
    // created_by sættes af trigger
  }
  const { data, error } = await supabase
    .from('tender_documents')
    .insert(payload as any)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const row = (data ?? {}) as TD_Row
  const signed_url = await signUrl(storage_path)
  await logAction(user.id, 'document.uploaded', 'tender', params.id, { file_name: file.name, size_bytes: file.size })
  return NextResponse.json({ ...row, signed_url }, { status: 201 })
}
