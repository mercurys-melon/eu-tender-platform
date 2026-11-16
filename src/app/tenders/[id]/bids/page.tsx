export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getManagedTender } from '@/lib/authz'
import { getBidCount } from '@/lib/bids/count'
import { BlockBidCard } from '@/components/ui/blockbid-card'
import { BidsEvaluationTable } from '@/components/tenders/BidsEvaluationTable'
import type { Database } from '@/lib/supabase/types'

type BidRow = Database['public']['Tables']['bids']['Row']

/**
 * Tilbudsoversigt for ordregiver.
 *
 * Adgang: kun brugere der administrerer udbuddet (tjekkes eksplicit her).
 * Fortrolighed: bids-RLS ("bids_buyer_select_after_deadline") udleverer først
 * tilbud efter fristen. Før fristen vises kun antal via get_bid_count_for_tender
 * (ingen identitet eller tidspunkter).
 */
export default async function BidsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const user = await getCurrentUser()
  if (!user) redirect(`/login?redirectTo=/tenders/${params.id}/bids`)

  const tender = await getManagedTender(user.id, params.id)
  if (!tender) notFound()

  const deadlinePassed = new Date(tender.submission_deadline).getTime() <= Date.now()
  const supabase = await createClient()

  let bids: BidRow[] = []
  let submittedCount = 0

  if (deadlinePassed) {
    const { data, error } = await supabase
      .from('bids')
      .select('*')
      .eq('tender_id', params.id)
      .order('amount', { ascending: true })
    if (error) console.error('[bids page] kunne ikke hente bud:', error.message)
    bids = data ?? []
  } else {
    submittedCount = await getBidCount(supabase, params.id)
  }

  const deadlineText = new Date(tender.submission_deadline).toLocaleString('da-DK', {
    timeZone: 'Europe/Copenhagen',
    dateStyle: 'long',
    timeStyle: 'short',
  })

  return (
    <div className="space-y-6">
      <BlockBidCard>
        <div className="mb-6">
          <h2 className="text-h2 text-digital-navy mb-2">Tilbud på udbud</h2>
          <p className="text-granite-grey">
            {deadlinePassed
              ? `Tilbudsfristen udløb ${deadlineText}. Tilbuddene er åbnet.`
              : `Tilbuddene er forseglede indtil fristen ${deadlineText}.`}
          </p>
        </div>

        {!deadlinePassed ? (
          <div className="py-12 text-center">
            <p className="text-granite-grey text-lg">
              {submittedCount === 0
                ? 'Der er endnu ikke modtaget tilbud.'
                : `${submittedCount} tilbud modtaget. Indholdet kan først ses efter fristen.`}
            </p>
          </div>
        ) : bids.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-granite-grey text-lg">Der blev ikke modtaget nogen tilbud.</p>
          </div>
        ) : (
          // awarded_bid_id kommer med migration #8 (award_bid-RPC); indtil da null
          <BidsEvaluationTable initialBids={bids} tenderId={params.id} awardedBidId={null} />
        )}
      </BlockBidCard>
    </div>
  )
}
