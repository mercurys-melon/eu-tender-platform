'use client'

import { useState } from 'react'
import { BidStatusBadge } from './BidStatusBadge'
import { BlockBidButton } from '@/components/ui/blockbid-button'
import type { Database } from '@/lib/supabase/types'

type BidStatus = 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'under_evaluation' | 'winner' | 'not_awarded'

type BidWithSupplier = Database['public']['Tables']['bids']['Row'] & {
  suppliers?: {
    company_name: string
  } | null
}

interface BidEvaluationRowProps {
  bid: BidWithSupplier
  tenderId: string
  isWinner: boolean
  onUpdate: () => void
}

const statusOptions: { value: BidStatus; label: string }[] = [
  { value: 'submitted', label: 'Indsendt' },
  { value: 'under_evaluation', label: 'Under evaluering' },
  { value: 'winner', label: 'Vinder' },
  { value: 'not_awarded', label: 'Ikke tildelt' },
]

export function BidEvaluationRow({ bid, tenderId, isWinner, onUpdate }: BidEvaluationRowProps) {
  const [status, setStatus] = useState<BidStatus>(bid.status as BidStatus)
  const [notes, setNotes] = useState(bid.evaluation_notes || '')
  const [showNotes, setShowNotes] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStatusChange = async (newStatus: BidStatus) => {
    setStatus(newStatus)
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/tenders/${tenderId}/bids/${bid.id}/evaluate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kunne ikke opdatere status')
      }

      onUpdate()
    } catch (err: any) {
      setError(err.message)
      setStatus(bid.status as BidStatus) // Revert on error
    } finally {
      setSaving(false)
    }
  }

  const handleNotesSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/tenders/${tenderId}/bids/${bid.id}/evaluate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evaluation_notes: notes,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kunne ikke gemme noter')
      }

      onUpdate()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const supplierName = bid.suppliers?.company_name || `Leverandør ${bid.supplier_id.slice(0, 8)}`

  return (
    <>
      <tr className="border-b border-soft-sand/50 hover:bg-soft-sand/20 transition-colors">
        <td className="py-4 px-4 text-granite-grey">
          <div className="flex items-center gap-2">
            {supplierName}
            {isWinner && (
              <span className="text-xs text-pixel-grey font-medium">🏆 Vinder</span>
            )}
          </div>
        </td>
        <td className="py-4 px-4 text-digital-navy font-medium">
          {new Intl.NumberFormat('da-DK', {
            style: 'currency',
            currency: bid.currency,
          }).format(bid.amount)}
        </td>
        <td className="py-4 px-4">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as BidStatus)}
            disabled={saving}
            className="rounded-full border border-soft-sand px-3 py-1.5 text-sm bg-white text-digital-navy focus:outline-none focus:ring-2 focus:ring-xp-sky-blue/50 focus:border-xp-sky-blue disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </td>
        <td className="py-4 px-4 text-granite-grey">
          {new Date(bid.submitted_at).toLocaleDateString('da-DK', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </td>
        <td className="py-4 px-4 text-granite-grey">
          {bid.documents?.length || 0} {bid.documents?.length === 1 ? 'dokument' : 'dokumenter'}
        </td>
        <td className="py-4 px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="text-sm text-xp-sky-blue hover:text-digital-navy transition-colors"
              style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
            >
              {showNotes ? 'Skjul noter' : 'Noter'}
            </button>
          </div>
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={6} className="px-4 py-2 text-sm text-sunset-orange bg-sunset-orange/10">
            {error}
          </td>
        </tr>
      )}
      {showNotes && (
        <tr>
          <td colSpan={6} className="px-4 py-4 bg-soft-sand/20">
            <div className="space-y-3">
              <label
                className="block text-sm font-medium text-digital-navy"
                style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
              >
                Evalueringsnote (intern)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tilføj interne noter om dette bud..."
                rows={3}
                className="w-full rounded-lg border border-soft-sand px-4 py-2 bg-white text-digital-navy placeholder-granite-grey focus:outline-none focus:ring-2 focus:ring-xp-sky-blue/50 focus:border-xp-sky-blue resize-none"
                style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
              />
              <div className="flex justify-end">
                <BlockBidButton
                  variant="secondary"
                  size="sm"
                  onClick={handleNotesSave}
                  disabled={saving}
                >
                  {saving ? 'Gemmer...' : 'Gem noter'}
                </BlockBidButton>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

