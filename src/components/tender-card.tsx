import Link from 'next/link'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'

interface Tender {
  id: string
  title: string
  description: string
  deadline: string
  status: 'active' | 'pending' | 'closed'
  category: string
  budget?: string
}

interface TenderCardProps {
  tender: Tender
}

export function TenderCard({ tender }: TenderCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'status-active'
      case 'pending':
        return 'status-pending'
      case 'closed':
        return 'status-closed'
      default:
        return 'status-neutral'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktiv'
      case 'pending':
        return 'Afventer'
      case 'closed':
        return 'Lukket'
      default:
        return 'Ukendt'
    }
  }

  return (
    <Link href={`/tenders/${tender.id}`} className="block">
      <div className="card-hover p-6 h-full">
        <div className="flex justify-between items-start mb-4">
          <span className="badge badge-primary">{tender.category}</span>
          <span className={`badge ${getStatusColor(tender.status)}`}>
            {getStatusText(tender.status)}
          </span>
        </div>
        
        <h3 className="text-h4 mb-3 line-clamp-2 hover:text-nordic-blue transition-colors">
          {tender.title}
        </h3>
        
        <p className="text-granite-grey text-small mb-4 line-clamp-3">
          {tender.description}
        </p>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-small">
            <span className="text-slate-grey">Deadline:</span>
            <span className="font-medium text-granite-grey">
              {format(new Date(tender.deadline), 'dd. MMM yyyy', { locale: da })}
            </span>
          </div>
          
          {tender.budget && (
            <div className="flex items-center justify-between text-small">
              <span className="text-slate-grey">Budget:</span>
              <span className="font-medium text-granite-grey">{tender.budget}</span>
            </div>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-silver-mist">
          <div className="flex items-center text-emerald-green text-small font-medium">
            <span>Se detaljer</span>
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  )
} 