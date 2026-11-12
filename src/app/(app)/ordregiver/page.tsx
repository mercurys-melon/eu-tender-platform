export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { getMyOrganisationIds } from '@/lib/authz'
import { getBidCount } from '@/lib/bids/count'
import { redirect } from 'next/navigation'
import { UpcomingDeadlinesCard } from '@/components/tenders/UpcomingDeadlinesCard'
import { QuickActionsCard } from '@/components/buyer/QuickActionsCard'
import { TenderSection } from '@/components/buyer/TenderSection'
import type { Tender, UpcomingDeadline } from '@/lib/tenders/types'

interface TenderWithStats extends Tender {
  bids_count?: number
  participants_count?: number
}

/**
 * Udbud brugeren administrerer: via organisations-medlemskab ELLER legacy entity_id.
 * Antal tilbud hentes via get_bid_count_for_tender, fordi bids-RLS (korrekt)
 * skjuler tilbuddene for ordregiver indtil fristen.
 */
async function getBuyerTenders(userId: string): Promise<TenderWithStats[]> {
  const supabase = createClient()
  const orgIds = await getMyOrganisationIds()

  const ownerFilter =
    orgIds.length > 0
      ? `entity_id.eq.${userId},organisation_id.in.(${orgIds.join(',')})`
      : `entity_id.eq.${userId}`

  const { data: tenders, error } = await supabase
    .from('tenders')
    .select('id, title, description, entity_id, category, estimated_value, currency, submission_deadline, publication_date, status, espd_required, ted_published, created_at, updated_at')
    .or(ownerFilter)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tenders:', error.message)
    return []
  }

  return Promise.all(
    (tenders ?? []).map(async (tender) => ({
      ...(tender as Tender),
      bids_count: await getBidCount(supabase, tender.id),
    })),
  )
}

function groupTendersBySection(tenders: TenderWithStats[]) {
  const preparation: TenderWithStats[] = [] // draft
  const active: TenderWithStats[] = [] // published, prequalification, bidding, evaluation
  const awarded: TenderWithStats[] = [] // awarded
  const completed: TenderWithStats[] = [] // closed, cancelled

  tenders.forEach(tender => {
    if (tender.status === 'draft') {
      preparation.push(tender)
    } else if (['published', 'prequalification', 'bidding', 'evaluation'].includes(tender.status)) {
      active.push(tender)
    } else if (tender.status === 'awarded') {
      awarded.push(tender)
    } else if (['closed', 'cancelled'].includes(tender.status)) {
      completed.push(tender)
    }
  })

  return { preparation, active, awarded, completed }
}

function buildUpcomingDeadlines(tenders: TenderWithStats[]): UpcomingDeadline[] {
  const now = new Date()
  const deadlines: UpcomingDeadline[] = []

  tenders.forEach(tender => {
    if (tender.submission_deadline) {
      const deadlineDate = new Date(tender.submission_deadline)
      if (deadlineDate > now) {
        deadlines.push({
          tenderId: tender.id,
          tenderTitle: tender.title,
          type: 'submission',
          date: tender.submission_deadline,
          status: tender.status,
        })
      }
    }

    // prequalification_/questions_deadline kommer med tender_phases (#4)
  })

  // Sort by date ascending and limit to 5
  return deadlines
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)
}

export default async function BuyerDashboard() {
  // Rolle-gating sker i ordregiver/layout.tsx (active_role)
  const user = await getUser()
  if (!user) redirect('/login')
  const userId = user.id

  // Fetch data
  const tenders = await getBuyerTenders(userId)

  // Group tenders by section
  const { preparation, active, awarded, completed } = groupTendersBySection(tenders)

  // Build upcoming deadlines
  const upcomingDeadlines = buildUpcomingDeadlines(tenders)

  return (
    <div className="min-h-screen bg-xp-sky-blue/5">
      <div className="container-blockbid py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-h1 mb-2" style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>
            Ordregiver Dashboard
          </h1>
          <p className="text-granite-grey" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
            Overblik over dine udbud og deres status
          </p>
        </div>

        {/* Main grid: left sidebar + tender sections */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Left sidebar */}
          <div className="space-y-6">
            <QuickActionsCard />
            <UpcomingDeadlinesCard deadlines={upcomingDeadlines} />
          </div>

          {/* Right column: Tender sections */}
          <div className="space-y-8">
            {/* Udbud i forberedelse */}
            <TenderSection
              title="Udbud i forberedelse"
              description="Udbud du er i gang med at oprette. De er ikke offentliggjort endnu."
              tenders={preparation}
              emptyMessage="Du har ingen udbud i udkast lige nu."
              headerAction={
                <Link href="/ordregiver/opret" className="btn-primary">
                  Opret nyt udbud
                </Link>
              }
            />

            {/* Udbud aktivt */}
            <TenderSection
              title="Udbud aktivt"
              description="Aktive udbud, hvor leverandører kan ansøge, byde eller hvor der evalueres."
              tenders={active}
              emptyMessage="Du har ingen aktive udbud lige nu. Når du publicerer et udbud, vises det her."
            />

            {/* Tildelte udbud */}
            <TenderSection
              title="Tildelte udbud"
              description="Udbud hvor tildeling er gennemført."
              tenders={awarded}
              emptyMessage="Ingen tildelte udbud endnu."
            />

            {/* Afsluttede og annullerede udbud */}
            <TenderSection
              title="Afsluttede og annullerede udbud"
              description="Historiske udbud – til arkiv og dokumentation."
              tenders={completed}
              emptyMessage="Ingen afsluttede/annullerede udbud at vise endnu."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

