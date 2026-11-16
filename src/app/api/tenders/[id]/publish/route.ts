/**
 * POST /api/tenders/[id]/publish — publicering til Udbud.dk.
 *
 * MIDLERTIDIGT DEAKTIVERET (okt. 2026): Den tidligere service sendte fladt JSON
 * til en ikke-eksisterende publication_jobs-tabel. Genopbygges i pilotplanens
 * fase 2 på: eForms UBL XML (skabelon fra bestået funktionel test),
 * /valider før /publicer, og publication_events (#2) som audit-log.
 * udbud-dk-client.ts (token-flow, miljø-guards, mTLS) er bevaret.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getManagedTender } from '@/lib/authz'

export const runtime = 'nodejs'

async function authorize(tenderId: string) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })
  const tender = await getManagedTender(user.id, tenderId)
  if (!tender) return NextResponse.json({ error: 'Ingen adgang' }, { status: 403 })
  return null
}

export async function POST(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const denied = await authorize(params.id)
  if (denied) return denied
  return NextResponse.json(
    { error: 'Publicering til Udbud.dk er ikke aktiveret endnu.' },
    { status: 501 },
  )
}

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const denied = await authorize(params.id)
  if (denied) return denied
  return NextResponse.json({ jobs: [] }, { status: 200 })
}
