import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { da } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { getSessionAndRole } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { TenderStatusBadge } from '@/components/tenders/TenderStatusBadge'
import { UpcomingDeadlinesCard } from '@/components/tenders/UpcomingDeadlinesCard'
import { QuickActionsCard } from '@/components/buyer/QuickActionsCard'
import { TenderSection } from '@/components/buyer/TenderSection'
import type { Tender, UpcomingDeadline } from '@/lib/tenders/types'
import { 
  getTenderStatusGroup, 
  canTransitionTenderStatus,
  getNextTenderStatuses 
} from '@/lib/tenders/lifecycle'

interface TenderWithStats extends Tender {
  bids_count?: number
  participants_count?: number
}

async function getBuyerTenders(userId: string) {
  const supabase = createClient()

  // Get tenders where entity_id matches user ID
  const { data: tenders, error } = await supabase
    .from('tenders')
    .select('id, title, status, submission_deadline, prequalification_deadline, questions_deadline, created_at, updated_at')
    .eq('entity_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tenders:', error)
    return []
  }

  // Get bid counts for each tender
  const tenderIds = tenders?.map(t => t.id) || []
  if (tenderIds.length > 0) {
    const { data: bids } = await supabase
      .from('bids')
      .select('tender_id')
      .in('tender_id', tenderIds)

    const bidCounts = bids?.reduce((acc, bid) => {
      acc[bid.tender_id] = (acc[bid.tender_id] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Get participant counts
    const { data: participants } = await supabase
      .from('tender_participants')
      .select('tender_id')
      .in('tender_id', tenderIds)

    const participantCounts = participants?.reduce((acc, p) => {
      acc[p.tender_id] = (acc[p.tender_id] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return tenders?.map(tender => ({
      ...tender,
      bids_count: bidCounts[tender.id] || 0,
      participants_count: participantCounts[tender.id] || 0,
    })) || []
  }

  return tenders || []
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

    if (tender.prequalification_deadline) {
      const deadlineDate = new Date(tender.prequalification_deadline)
      if (deadlineDate > now) {
        deadlines.push({
          tenderId: tender.id,
          tenderTitle: tender.title,
          type: 'prequalification',
          date: tender.prequalification_deadline,
          status: tender.status,
        })
      }
    }

    if (tender.questions_deadline) {
      const deadlineDate = new Date(tender.questions_deadline)
      if (deadlineDate > now) {
        deadlines.push({
          tenderId: tender.id,
          tenderTitle: tender.title,
          type: 'questions',
          date: tender.questions_deadline,
          status: tender.status,
        })
      }
    }
  })

  // Sort by date ascending and limit to 5
  return deadlines
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)
}

function getPrimaryActionButton(tender: TenderWithStats) {
  const canPublish = canTransitionTenderStatus(tender.status as any, 'published')
  
  switch (tender.status) {
    case 'draft':
      return {
        label: 'Fortsæt med at oprette',
        href: `/buyer/mine-udbud/${tender.id}`,
        showPublish: canPublish,
      }
    case 'published':
      return {
        label: tender.participants_count ? 'Se ansøgninger' : 'Administrer udbud',
        href: `/buyer/mine-udbud/${tender.id}`,
        showPublish: false,
      }
    case 'prequalification':
      return {
        label: 'Vurder ansøgninger',
        href: `/buyer/mine-udbud/${tender.id}`,
        showPublish: false,
      }
    case 'bidding':
      return {
        label: 'Se tilbud',
        href: `/buyer/mine-udbud/${tender.id}`,
        showPublish: false,
      }
    case 'evaluation':
      return {
        label: 'Evaluer tilbud',
        href: `/buyer/mine-udbud/${tender.id}`,
        showPublish: false,
      }
    case 'awarded':
      return {
        label: 'Se tildelingsresultat',
        href: `/buyer/mine-udbud/${tender.id}`,
        showPublish: false,
      }
    default:
      return {
        label: 'Se udbud',
        href: `/buyer/mine-udbud/${tender.id}`,
        showPublish: false,
      }
  }
}

// Simple line icon components
const CalendarIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const DocumentIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

export default async function BuyerDashboard() {
  // Get session and role
  const sessionData = await getSessionAndRole()

  // If no session, redirect to login
  if (!sessionData.session || !sessionData.userId) {
    redirect('/login')
  }

  // If wrong role, redirect to appropriate dashboard
  if (sessionData.role !== 'buyer') {
    if (sessionData.role === 'supplier') {
      redirect('/supplier')
    } else {
      // No role or unknown role - redirect to login
      redirect('/login')
    }
  }

  const { userId } = sessionData

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
              primaryAction={getPrimaryActionButton}
              headerAction={
                <Link href="/buyer/opret" className="btn-primary">
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
              primaryAction={getPrimaryActionButton}
            />

            {/* Tildelte udbud */}
            <TenderSection
              title="Tildelte udbud"
              description="Udbud hvor tildeling er gennemført."
              tenders={awarded}
              emptyMessage="Ingen tildelte udbud endnu."
              primaryAction={getPrimaryActionButton}
            />

            {/* Afsluttede og annullerede udbud */}
            <TenderSection
              title="Afsluttede og annullerede udbud"
              description="Historiske udbud – til arkiv og dokumentation."
              tenders={completed}
              emptyMessage="Ingen afsluttede/annullerede udbud at vise endnu."
              primaryAction={getPrimaryActionButton}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

