import Link from 'next/link'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import type { UpcomingDeadline } from '@/lib/tenders/types'
import { TenderStatusBadge } from './TenderStatusBadge'

interface UpcomingDeadlinesCardProps {
  deadlines: UpcomingDeadline[]
}

const deadlineTypeLabels: Record<UpcomingDeadline['type'], string> = {
  submission: 'Tilbudsfrist',
  prequalification: 'Prækvalifikationsfrist',
  questions: 'Frist for spørgsmål',
}

export function UpcomingDeadlinesCard({ deadlines }: UpcomingDeadlinesCardProps) {
  return (
    <div className="card p-6">
      <h2 className="text-h3 mb-4" style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>
        Kommende deadlines
      </h2>

      {deadlines.length > 0 ? (
        <div className="space-y-4">
          {deadlines.map((deadline, index) => (
            <div
              key={`${deadline.tenderId}-${deadline.type}-${index}`}
              className="border border-soft-sand rounded-[20px] p-4 hover:border-xp-sky-blue/30 transition-colors bg-white"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <Link
                  href={`/tenders/${deadline.tenderId}`}
                  className="font-semibold text-digital-navy hover:text-xp-sky-blue transition-colors flex-1"
                  style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
                >
                  {deadline.tenderTitle}
                </Link>
                <TenderStatusBadge status={deadline.status} />
              </div>
              <div className="flex items-center gap-2 text-sm text-granite-grey">
                <span style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                  {deadlineTypeLabels[deadline.type]}:
                </span>
                <span style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                  {format(new Date(deadline.date), 'dd. MMM yyyy kl. HH:mm', { locale: da })}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border border-dashed border-soft-sand rounded-[20px] bg-soft-sand/30">
          <p className="text-granite-grey" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
            Når dine udbud har kommende frister, vises de her.
          </p>
        </div>
      )}
    </div>
  )
}

