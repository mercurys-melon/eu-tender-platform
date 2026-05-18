export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { da } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { getSessionAndRole } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { SupplierStatusBadge } from '@/components/tenders/SupplierStatusBadge'
import { TenderStatusBadge } from '@/components/tenders/TenderStatusBadge'
import type { SupplierTenderStatus } from '@/lib/tenders/types'
import { 
  getSupplierStatusGroup, 
  canSupplierBid, 
  canSupplierParticipate 
} from '@/lib/tenders/lifecycle'

interface OpenTender {
  id: string
  title: string
  entity_id: string
  submission_deadline: string
  status: string
  category: string
  participant_status?: SupplierTenderStatus | null
}

interface MyParticipation {
  id: string
  tender_id: string
  tender_title: string
  tender_status: string
  supplier_status: SupplierTenderStatus
  submission_deadline: string
  created_at: string
}

async function getSupplierId(userId: string): Promise<string | null> {
  // Med ny RLS-model (migration 20260428143000) er bids.supplier_id en
  // direkte FK til auth.users.id — supplierId og userId er det samme.
  // Suppliers-tabellen er droppet; funktionssignatur bevares for
  // bagudkompatibilitet med call-sites indtil supplier-organisationsmodellen
  // er designet.
  return userId
}

async function getOpenTenders(supplierId: string | null): Promise<OpenTender[]> {
  const supabase = createClient()
  const now = new Date()

  // Get published or bidding tenders with future deadline
  const { data: tenders } = await supabase
    .from('tenders')
    .select('id, title, entity_id, submission_deadline, status, category')
    .in('status', ['published', 'bidding'])
    .gte('submission_deadline', now.toISOString())
    .order('submission_deadline', { ascending: true })
    .limit(20)

  if (!tenders || tenders.length === 0) return []

  // If supplier exists, get their participation status
  if (supplierId) {
    const tenderIds = tenders.map(t => t.id)
    const { data: participants } = await supabase
      .from('tender_participants')
      .select('tender_id, supplier_status')
      .eq('supplier_id', supplierId)
      .in('tender_id', tenderIds)

    const participantMap = participants?.reduce((acc, p) => {
      acc[p.tender_id] = p.supplier_status as SupplierTenderStatus
      return acc
    }, {} as Record<string, SupplierTenderStatus>) || {}

    return tenders.map(tender => ({
      ...tender,
      participant_status: participantMap[tender.id] || null,
    })) as unknown as OpenTender[]
  }

  return tenders.map(tender => ({
    ...tender,
    participant_status: null,
  })) as unknown as OpenTender[]
}

async function getMyParticipations(supplierId: string): Promise<MyParticipation[]> {
  const supabase = createClient()

  const { data: participants } = await supabase
    .from('tender_participants')
    .select('id, tender_id, supplier_status, created_at')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })

  if (!participants || participants.length === 0) return []

  // Get tender details
  const tenderIds = participants.map(p => p.tender_id)
  const { data: tenders } = await supabase
    .from('tenders')
    .select('id, title, status, submission_deadline')
    .in('id', tenderIds)

  const tenderMap = tenders?.reduce((acc, t) => {
    acc[t.id] = t
    return acc
  }, {} as Record<string, { title: string; status: string | null; submission_deadline: string | null }>) || {}

  return participants
    .map(p => {
      const tender = tenderMap[p.tender_id]
      if (!tender) return null

      return {
        id: p.id,
        tender_id: p.tender_id,
        tender_title: tender.title,
        tender_status: tender.status,
        supplier_status: p.supplier_status as SupplierTenderStatus,
        submission_deadline: tender.submission_deadline,
        created_at: p.created_at,
      }
    })
    .filter((p): p is MyParticipation => p !== null)
}

function groupParticipationsBySection(participations: MyParticipation[]) {
  const discoverable: MyParticipation[] = [] // For open tenders section
  const active: MyParticipation[] = [] // interest_submitted, prequalified, proposal_in_progress, proposal_submitted, under_evaluation
  const results: MyParticipation[] = [] // awarded, not_awarded

  participations.forEach(participation => {
    const group = getSupplierStatusGroup(participation.supplier_status)
    if (group === 'active') {
      active.push(participation)
    } else if (group === 'result') {
      results.push(participation)
    }
  })

  return { discoverable, active, results }
}

function filterDiscoverableTenders(tenders: OpenTender[]): OpenTender[] {
  return tenders.filter(t => {
    // Discoverable if no participation or prequalified
    return !t.participant_status || t.participant_status === 'prequalified'
  })
}

function getSupplierActionButton(tender: OpenTender) {
  if (!tender.participant_status) {
    return {
      primary: { label: 'Se udbud', href: `/tenders/${tender.id}` },
      secondary: { label: 'Anmod om deltagelse', href: `/tenders/${tender.id}/interest` },
    }
  }
  
  if (tender.participant_status === 'prequalified') {
    return {
      primary: { label: 'Gå til tilbud', href: `/tenders/${tender.id}/bid` },
      secondary: null,
    }
  }
  
  if (tender.participant_status === 'proposal_in_progress') {
    return {
      primary: { label: 'Fortsæt tilbud', href: `/tenders/${tender.id}/bid` },
      secondary: null,
    }
  }

  return {
    primary: { label: 'Se udbud', href: `/tenders/${tender.id}` },
    secondary: null,
  }
}

function getParticipationActionButton(participation: MyParticipation) {
  switch (participation.supplier_status) {
    case 'interest_submitted':
      return { label: 'Se ansøgning', href: `/tenders/${participation.tender_id}` }
    case 'proposal_in_progress':
      return { label: 'Fortsæt tilbud', href: `/tenders/${participation.tender_id}/bid` }
    case 'proposal_submitted':
      return { label: 'Se indsendt tilbud', href: `/tenders/${participation.tender_id}` }
    default:
      return { label: 'Se udbud', href: `/tenders/${participation.tender_id}` }
  }
}

// Simple line icon components
const CalendarIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

export default async function SupplierDashboard() {
  // Get session and role
  const sessionData = await getSessionAndRole()

  // If no session, redirect to login
  if (!sessionData.session || !sessionData.userId) {
    redirect('/login')
  }

  // If wrong role, redirect to appropriate dashboard
  if (sessionData.role !== 'supplier') {
    if (sessionData.role === 'buyer') {
      redirect('/buyer')
    } else {
      // No role or unknown role - redirect to login
      redirect('/login')
    }
  }

  const { userId } = sessionData

  // Get supplier ID
  const supplierId = await getSupplierId(userId)

  if (!supplierId) {
    return (
      <div className="min-h-screen bg-xp-sky-blue/5">
        <div className="container-blockbid py-8">
          <div className="card p-6">
            <h1 className="text-h2 mb-4" style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>
              Velkommen, Leverandør
            </h1>
            <p className="text-granite-grey mb-4" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
              Du skal oprette en leverandørprofil først.
            </p>
            <Link href="/supplier/profil" className="btn-primary">
              Opret profil
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Fetch data in parallel
  const [openTenders, participations] = await Promise.all([
    getOpenTenders(supplierId),
    getMyParticipations(supplierId),
  ])

  // Group participations by lifecycle
  const { active: activeParticipations, results } = groupParticipationsBySection(participations)

  // Filter discoverable tenders
  const discoverableTenders = filterDiscoverableTenders(openTenders)

  return (
    <div className="min-h-screen bg-xp-sky-blue/5">
      <div className="container-blockbid py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-h1 mb-2" style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>
            Leverandør Dashboard
          </h1>
          <p className="text-granite-grey" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
            Overblik over åbne udbud, dine tilbud og resultater
          </p>
        </div>

        {/* Åbne udbud du kan byde på */}
        <section className="card p-6">
          <div className="mb-4">
            <h2 className="text-h3 mb-1" style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>
              Åbne udbud du kan byde på
            </h2>
            <p className="text-sm text-granite-grey" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
              Udbud hvor du kan ansøge eller byde.
            </p>
          </div>

          {discoverableTenders.length > 0 ? (
            <div className="space-y-4">
              {discoverableTenders.map(tender => {
                const actions = getSupplierActionButton(tender)
                return (
                  <div
                    key={tender.id}
                    className="border border-soft-sand rounded-[20px] p-5 hover:border-xp-sky-blue/30 transition-colors bg-white"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-digital-navy mb-2" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                          {tender.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-granite-grey mb-2">
                          <TenderStatusBadge status={tender.status as any} />
                          {tender.participant_status && (
                            <SupplierStatusBadge status={tender.participant_status} />
                          )}
                          {tender.submission_deadline && (
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-4 h-4 text-pixel-grey" />
                              Deadline: {format(new Date(tender.submission_deadline), 'dd. MMM yyyy', { locale: da })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={actions.primary.href} className="btn-primary text-sm px-4 py-2">
                        {actions.primary.label}
                      </Link>
                      {actions.secondary && (
                        <Link href={actions.secondary.href} className="btn-outline text-sm px-4 py-2">
                          {actions.secondary.label}
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-soft-sand rounded-[20px] bg-soft-sand/30">
              <p className="text-granite-grey mb-4" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                Der er ingen åbne udbud, der matcher dig lige nu.
              </p>
              <Link href="/supplier/soeg" className="btn-primary">
                Søg efter udbud
              </Link>
            </div>
          )}
        </section>

        {/* Dine aktive tilbud */}
        <section className="card p-6">
          <div className="mb-4">
            <h2 className="text-h3 mb-1" style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>
              Dine aktive tilbud
            </h2>
            <p className="text-sm text-granite-grey" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
              Udbud hvor du har ansøgt eller afgivet tilbud.
            </p>
          </div>

          {activeParticipations.length > 0 ? (
            <div className="space-y-4">
              {activeParticipations.map(participation => {
                const action = getParticipationActionButton(participation)
                return (
                  <div
                    key={participation.id}
                    className="border border-soft-sand rounded-[20px] p-5 hover:border-xp-sky-blue/30 transition-colors bg-white"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-digital-navy mb-2" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                          {participation.tender_title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-granite-grey mb-2">
                          <TenderStatusBadge status={participation.tender_status as any} />
                          <SupplierStatusBadge status={participation.supplier_status} />
                          {participation.submission_deadline && (
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-4 h-4 text-pixel-grey" />
                              Deadline: {format(new Date(participation.submission_deadline), 'dd. MMM yyyy', { locale: da })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Link href={action.href} className="btn-primary text-sm px-4 py-2 inline-block">
                      {action.label}
                    </Link>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-soft-sand rounded-[20px] bg-soft-sand/30">
              <p className="text-granite-grey mb-4" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                Du har ingen aktive tilbud.
              </p>
              <Link href="/supplier/soeg" className="btn-primary">
                Find udbud at byde på
              </Link>
            </div>
          )}
        </section>

        {/* Resultater */}
        <section className="card p-6">
          <div className="mb-4">
            <h2 className="text-h3 mb-1" style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>
              Resultater
            </h2>
            <p className="text-sm text-granite-grey" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
              Udbud hvor evaluering er afsluttet.
            </p>
          </div>

          {results.length > 0 ? (
            <div className="space-y-4">
              {results.map(participation => (
                <div
                  key={participation.id}
                  className="border border-soft-sand rounded-[20px] p-5 hover:border-xp-sky-blue/30 transition-colors bg-white"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-digital-navy mb-2" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                        {participation.tender_title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-granite-grey">
                        <TenderStatusBadge status={participation.tender_status as any} />
                        <SupplierStatusBadge status={participation.supplier_status} />
                      </div>
                    </div>
                  </div>
                  <Link 
                    href={`/tenders/${participation.tender_id}`}
                    className="btn-primary text-sm px-4 py-2 inline-block"
                  >
                    Se resultat
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-soft-sand rounded-[20px] bg-soft-sand/30">
              <p className="text-granite-grey" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                Du har endnu ingen afsluttede resultater.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
