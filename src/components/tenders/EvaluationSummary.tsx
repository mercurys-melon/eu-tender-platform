'use client'

import { BlockBidCard } from '@/components/ui/blockbid-card'
import { formatDate } from '@/lib/utils/format'
import { getFileIcon } from '@/lib/storage'

interface EvaluationSummaryProps {
  awardedBidId: string | null
  evaluationStartedAt: string | null
  evaluationCompletedAt: string | null
  evaluationDocuments: Array<{ path: string; fileName: string; url: string | null }>
  winnerSupplierName?: string | null
}

export function EvaluationSummary({
  awardedBidId,
  evaluationStartedAt,
  evaluationCompletedAt,
  evaluationDocuments,
  winnerSupplierName,
}: EvaluationSummaryProps) {
  // Determine evaluation status
  let statusText = 'Ikke påbegyndt'
  let statusBadgeClass = 'bg-soft-sand/80 text-granite-grey border border-soft-sand'

  if (awardedBidId && evaluationCompletedAt) {
    statusText = 'Afsluttet'
    statusBadgeClass = 'bg-pixel-grey/10 text-pixel-grey border border-pixel-grey/30'
  } else if (evaluationStartedAt) {
    statusText = 'Under evaluering'
    statusBadgeClass = 'bg-sunset-orange/10 text-sunset-orange border border-sunset-orange/30'
  }

  return (
    <BlockBidCard>
      <div className="mb-4">
        <h3 className="text-h3 text-digital-navy mb-4" style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>
          Evalueringsstatus
        </h3>
        <div className="flex items-center gap-3 mb-4">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium tracking-wide ${statusBadgeClass}`}
            style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
          >
            {statusText}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {awardedBidId && evaluationCompletedAt ? (
          <>
            {winnerSupplierName && (
              <div>
                <p className="text-sm font-medium text-digital-navy mb-1" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                  Valgt leverandør:
                </p>
                <p className="text-granite-grey" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                  {winnerSupplierName}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-digital-navy mb-1" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                Evalueringsdato:
              </p>
              <p className="text-granite-grey" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                {formatDate(evaluationCompletedAt, 'PPP')}
              </p>
            </div>
          </>
        ) : evaluationStartedAt ? (
          <div>
            <p className="text-sm text-granite-grey" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
              Evaluering er påbegyndt {formatDate(evaluationStartedAt, 'PPP')}, men ikke afsluttet.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-granite-grey" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
              Evaluering er endnu ikke påbegyndt.
            </p>
          </div>
        )}

        {evaluationDocuments.length > 0 && (
          <div>
            <p className="text-sm font-medium text-digital-navy mb-2" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
              Evalueringsdokumenter:
            </p>
            <ul className="space-y-2">
              {evaluationDocuments.map((doc, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="text-sm">{getFileIcon('application/pdf')}</span>
                  {doc.url ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-xp-sky-blue hover:text-digital-navy transition-colors"
                      style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
                    >
                      {doc.fileName}
                    </a>
                  ) : (
                    <span className="text-sm text-granite-grey" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                      {doc.fileName}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </BlockBidCard>
  )
}

