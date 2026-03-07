import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { BlockBidCard } from '@/components/ui/blockbid-card'
import { BidsEvaluationTable } from '@/components/tenders/BidsEvaluationTable'
import { EvaluationDocumentsUpload } from '@/components/tenders/EvaluationDocumentsUpload'
import type { Database } from '@/lib/supabase/types'

// Type for the joined data structure that Supabase returns
type BidWithSupplier = Database['public']['Tables']['bids']['Row'] & {
  suppliers: {
    company_name: string
  } | null
}

async function getTender(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tenders')
    .select('id, title, status, awarded_bid_id')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

async function getBids(tenderId: string): Promise<BidWithSupplier[]> {
  const supabase = createClient()
  
  // Fetch bids with supplier company_name join
  // Note: RLS might restrict supplier access, so we handle null gracefully
  // Try with join first - if it fails due to RLS, fall back to basic query
  const { data, error } = await supabase
    .from('bids')
    .select(`
      *,
      suppliers (
        company_name
      )
    `)
    .eq('tender_id', tenderId)
    .order('amount', { ascending: true })

  if (error) {
    console.error('Error fetching bids with join:', error)
    // If join fails (e.g., due to RLS), try without join
    const { data: bidsData, error: bidsError } = await supabase
      .from('bids')
      .select('*')
      .eq('tender_id', tenderId)
      .order('amount', { ascending: true })
    
    if (bidsError) {
      console.error('Error fetching bids:', bidsError)
      return []
    }
    
    return (bidsData as BidWithSupplier[]) || []
  }

  return (data as BidWithSupplier[]) || []
}

export default async function BidsPage({ params }: { params: { id: string } }) {
  const tender = await getTender(params.id)

  if (!tender) {
    notFound()
  }

  const bids = await getBids(params.id)

  // Sort bids by amount (ascending) - already sorted in query, but ensure it
  const sortedBids = [...bids].sort((a, b) => a.amount - b.amount)

  // Fetch evaluation documents
  let evaluationDocuments: Array<{ path: string; fileName: string; url: string | null }> = []
  try {
    const serviceClient = createServiceClient()
    const evaluationDocs = tender.evaluation_documents || []
    evaluationDocuments = await Promise.all(
      evaluationDocs.map(async (path: string) => {
        const { data } = await serviceClient.storage
          .from('evaluation-documents')
          .createSignedUrl(path, 3600)
        const fileName = path.split('/').pop() || path
        return {
          path,
          fileName,
          url: data?.signedUrl || null,
        }
      })
    )
  } catch (error) {
    console.error('Error fetching evaluation documents:', error)
  }

  return (
    <div className="space-y-6">
      <BlockBidCard>
        <div className="mb-6">
          <h2 className="text-h2 text-digital-navy mb-2" style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>
            Tilbud på udbud
          </h2>
          <p className="text-granite-grey" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
            Oversigt over alle modtagne tilbud
          </p>
        </div>

        {sortedBids.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-granite-grey text-lg" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
              Der er endnu ikke modtaget nogen tilbud på dette udbud.
            </p>
          </div>
        ) : (
          <BidsEvaluationTable
            initialBids={sortedBids}
            tenderId={params.id}
            awardedBidId={tender.awarded_bid_id}
          />
        )}
      </BlockBidCard>

      <EvaluationDocumentsUpload
        tenderId={params.id}
        initialDocuments={evaluationDocuments}
      />
    </div>
  )
}

