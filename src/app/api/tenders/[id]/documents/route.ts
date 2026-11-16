export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerClient, getServiceClient } from '@/lib/supabase/server'
import { signUrl, STORAGE_BUCKET } from '@/lib/storage/server'
import { getCurrentUser, getMyOrganisationIds, isTenderManagedBy, isTenderPublic } from '@/lib/authz'
import { logAction } from '@/lib/audit'
import type { Database } from '@/lib/supabase/types'

type Row = Database['public']['Tables']['tender_documents']['Row']

/**
 * GET /api/tenders/[id]/documents
 *
 * - Ejer: alle dokumenter (også i kladde).
 * - Alle andre (inkl. anonyme): kun is_public-dokumenter på publicerede udbud.
 *   Udbudsmateriale skal være frit, direkte og gratis tilgængeligt fra
 *   offentliggørelsen — derfor intet login-krav for offentlige dokumenter.
 *
 * Signerede URL'er udstedes med service-role og må derfor KUN udstedes efter
 * autorisationen nedenfor.
 */
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const supabase = await getServerClient()

  const { data: tender } = await supabase
    .from('tenders')
    .select('id, status, entity_id, organisation_id')
    .eq('id', params.id)
    .maybeSingle()

  if (!tender) return NextResponse.json({ error: 'Udbuddet findes ikke' }, { status: 404 })

  const user = await getCurrentUser()
  const isManager = user ? isTenderManagedBy(tender, user.id, await getMyOrganisationIds()) : false

  if (!isManager && !isTenderPublic(tender)) {
    return NextResponse.json({ error: 'Udbuddet findes ikke' }, { status: 404 })
  }

  let query = getServiceClient()
    .from('tender_documents')
    .select('*')
    .eq('tender_id', params.id)
    .order('created_at', { ascending: false })
  if (!isManager) query = query.eq('is_public', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Kunne ikke hente dokumenter' }, { status: 500 })

  // Forsvar i dybden: signér kun filer, der ligger i udbuddets egen mappe.
  const prefix = `${params.id}/`
  const rows = ((data ?? []) as Row[]).filter((r) => r.storage_path.startsWith(prefix))
  const items = await Promise.all(
    rows.map(async (row) => ({ ...row, signed_url: await signUrl(row.storage_path) })),
  )
  return NextResponse.json({ items }, { status: 200 })
}

/**
 * DELETE /api/tenders/[id]/documents?id=<documentId>
 *
 * Kun ejer, og kun mens udbuddet er i kladde. Efter offentliggørelse er
 * ændring af udbudsmateriale en rettelse, der skal annonceres — ikke en sletning.
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const documentId = new URL(req.url).searchParams.get('id')
  if (!documentId) return NextResponse.json({ error: 'Dokument-id mangler' }, { status: 400 })

  const supabase = await getServerClient()
  const { data: tender } = await supabase
    .from('tenders')
    .select('id, status, entity_id, organisation_id')
    .eq('id', params.id)
    .maybeSingle()

  if (!tender || !isTenderManagedBy(tender, user.id, await getMyOrganisationIds())) {
    return NextResponse.json({ error: 'Ingen adgang' }, { status: 403 })
  }
  if (tender.status !== 'draft') {
    return NextResponse.json(
      { error: 'Udbudsmateriale kan ikke slettes efter offentliggørelse. Udsend en rettelse i stedet.' },
      { status: 409 },
    )
  }

  const db = getServiceClient()
  const { data: doc } = await db
    .from('tender_documents')
    .select('id, storage_path, file_name')
    .eq('id', documentId)
    .eq('tender_id', params.id)
    .maybeSingle()

  if (!doc) return NextResponse.json({ error: 'Dokumentet findes ikke' }, { status: 404 })
  if (!doc.storage_path.startsWith(`${params.id}/`)) {
    return NextResponse.json({ error: 'Ugyldig dokumentsti' }, { status: 400 })
  }

  const { error: delError } = await db.from('tender_documents').delete().eq('id', doc.id)
  if (delError) return NextResponse.json({ error: 'Kunne ikke slette dokument' }, { status: 500 })

  // Storage-sletning efter DB: en forældreløs fil er ufarlig, en forældreløs række er ikke.
  await db.storage.from(STORAGE_BUCKET).remove([doc.storage_path]).catch(() => undefined)

  await logAction(user.id, 'document.deleted', 'tender', params.id, { file_name: doc.file_name })
  return NextResponse.json({ ok: true }, { status: 200 })
}
