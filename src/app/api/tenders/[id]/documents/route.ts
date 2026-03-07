export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import { signUrl } from '@/lib/storage/server'
import type { Database } from '@/lib/supabase/types'
type Row = Database['public']['Tables']['tender_documents']['Row']
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('tender_documents').select('*')
    .eq('tender_id', params.id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data ?? []) as Row[]
  const withSigned = [] as Array<Row & { signed_url: string }>
  for (const row of rows) {
    const signed_url = await signUrl(row.storage_path)
    withSigned.push({ ...row, signed_url })
  }
  return NextResponse.json({ items: withSigned }, { status: 200 })
}
