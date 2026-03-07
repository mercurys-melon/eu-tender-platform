'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BidEvaluationRow } from './BidEvaluationRow'
import type { Database } from '@/lib/supabase/types'

type BidWithSupplier = Database['public']['Tables']['bids']['Row'] & {
  suppliers?: {
    company_name: string
  } | null
}

interface BidsEvaluationTableProps {
  initialBids: BidWithSupplier[]
  tenderId: string
  awardedBidId: string | null
}

export function BidsEvaluationTable({ initialBids, tenderId, awardedBidId }: BidsEvaluationTableProps) {
  const router = useRouter()
  const [bids, setBids] = useState(initialBids)
  const [awardedId, setAwardedId] = useState(awardedBidId)

  const handleUpdate = () => {
    // Refresh the page to get updated data
    router.refresh()
  }

  // Update local state when initialBids changes (after refresh)
  useEffect(() => {
    setBids(initialBids)
  }, [initialBids])

  const sortedBids = [...bids].sort((a, b) => a.amount - b.amount)

  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
        <thead>
          <tr className="border-b border-soft-sand">
            <th className="text-left py-3 px-4 text-sm font-semibold text-digital-navy bg-soft-sand/30">
              Leverandør
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-digital-navy bg-soft-sand/30">
              Beløb
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-digital-navy bg-soft-sand/30">
              Evalueringsstatus
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-digital-navy bg-soft-sand/30">
              Indsendt
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-digital-navy bg-soft-sand/30">
              Dokumenter
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-digital-navy bg-soft-sand/30">
              Noter
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedBids.map((bid) => (
            <BidEvaluationRow
              key={bid.id}
              bid={bid}
              tenderId={tenderId}
              isWinner={awardedId === bid.id}
              onUpdate={handleUpdate}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

