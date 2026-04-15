'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { MinecraftCard } from '@/components/ui/minecraft-card'
import { MinecraftButton } from '@/components/ui/minecraft-button'
import BidForm from '@/components/forms/bid-form'
import TenderDetailsHeader from '@/components/tenders/TenderDetailsHeader'
import QnAList from '@/components/tenders/QnAList'
import AskQuestionForm from '@/components/tenders/AskQuestionForm'
import DocumentsList from '@/components/tenders/DocumentsList'
import DocumentsUploader from '@/components/tenders/DocumentsUploader'
import { EvaluationSummary } from '@/components/tenders/EvaluationSummary'

interface Tender {
  id: string
  title: string
  description: string
  entity_id: string
  category: string
  estimated_value: number
  currency: string
  submission_deadline: string
  publication_date: string
  status: string
  espd_required: boolean
  ted_published: boolean
  created_at: string
}

interface TenderDetailsClientProps {
  id: string
  initialTender?: Tender | null
  evaluationData?: {
    awardedBidId: string | null
    evaluationStartedAt: string | null
    evaluationCompletedAt: string | null
    evaluationDocuments: Array<{ path: string; fileName: string; url: string | null }>
    winnerSupplierName: string | null
  }
}

export default function TenderDetailsClient({ id, initialTender = null, evaluationData }: TenderDetailsClientProps) {
  const [tender, setTender] = useState<Tender | null>(initialTender)
  const [loading, setLoading] = useState(!initialTender)
  const [error, setError] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!id) {
      setError('Intet udbuds-ID i URL.')
      setLoading(false)
      return
    }

    const fetchTenderAndUser = async () => {
      try {
        let resolvedTender = initialTender

        if (!resolvedTender) {
          setLoading(true)
          const { data: tenderData, error: tenderError } = await supabase()
            .from('tenders')
            .select('*')
            .eq('id', id)
            .single()

          if (tenderError) {
            throw tenderError
          }

          resolvedTender = tenderData as unknown as Tender
          setTender(tenderData as unknown as Tender)
        }

        const { data: { user: currentUser } } = await supabase().auth.getUser()
        setUser(currentUser)

        if (currentUser && resolvedTender) {
          setIsOwner(currentUser.id === resolvedTender.entity_id)
        }

      } catch (err: any) {
        console.error('Error in fetchTenderAndUser:', err)
        setError(err.message || 'Kunne ikke hente udbuddet.')
      } finally {
        setLoading(false)
      }
    }

    fetchTenderAndUser()
  }, [id, initialTender])

  if (loading) {
    return <div className="container-blockbid section-blockbid">Indlæser…</div>
  }

  if (error) {
    return <div className="container-blockbid section-blockbid text-red-600">{error}</div>
  }

  if (!tender) {
    return <p className="font-minecraft text-gray-600 text-center mt-10">Udbuddet blev ikke fundet.</p>
  }

  return (
    <div className="container-blockbid section-blockbid">
        {/* Header */}
        <TenderDetailsHeader tender={tender} isOwner={isOwner} />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Documents and Q&A */}
          <div className="lg:col-span-2 space-y-6">
            {/* Documents Section */}
            <div className="card p-6">
              <DocumentsList tenderId={tender.id} key={refreshKey} />
              {isOwner && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Upload dokument</h3>
                  <DocumentsUploader 
                    tenderId={tender.id} 
                    onUploadComplete={() => setRefreshKey(k => k + 1)} 
                  />
                </div>
              )}
            </div>

            {/* Q&A Section */}
            <div className="card p-6">
              <QnAList tenderId={tender.id} />
            </div>
          </div>

          {/* Right Column - Ask Question and Bid Form */}
          <div className="space-y-6">
            {/* Evaluation Summary - Only for buyers */}
            {isOwner && evaluationData && (
              <EvaluationSummary
                awardedBidId={evaluationData.awardedBidId}
                evaluationStartedAt={evaluationData.evaluationStartedAt}
                evaluationCompletedAt={evaluationData.evaluationCompletedAt}
                evaluationDocuments={evaluationData.evaluationDocuments}
                winnerSupplierName={evaluationData.winnerSupplierName}
              />
            )}

            {/* Ask Question Form */}
            {user && (
              <div className="card p-6">
                <AskQuestionForm tenderId={tender.id} />
              </div>
            )}

            {/* Bid Form */}
            <div className="card p-6">
              <BidForm tenderId={tender.id} onSuccess={() => console.log('Bud indsendt')} />
            </div>
          </div>
        </div>
      </div>
  )
}
