import type { SupplierTenderStatus } from '@/lib/tenders/types'

interface SupplierStatusBadgeProps {
  status: SupplierTenderStatus
  className?: string
}

const statusConfig: Record<
  SupplierTenderStatus,
  { label: string; className: string }
> = {
  interest_submitted: {
    label: 'Ansøgning sendt',
    className: 'bg-xp-sky-blue/10 text-digital-navy border border-xp-sky-blue/30',
  },
  prequalified: {
    label: 'Prækvalificeret',
    className: 'bg-xp-sky-blue/10 text-digital-navy border border-xp-sky-blue/30',
  },
  proposal_in_progress: {
    label: 'Tilbud (kladde)',
    className: 'bg-sunset-orange/10 text-sunset-orange border border-sunset-orange/30',
  },
  proposal_submitted: {
    label: 'Tilbud indsendt',
    className: 'bg-sunset-orange/10 text-sunset-orange border border-sunset-orange/30',
  },
  under_evaluation: {
    label: 'Under evaluering',
    className: 'bg-sunset-orange/10 text-sunset-orange border border-sunset-orange/30',
  },
  awarded: { 
    label: 'Tildelt', 
    className: 'bg-pixel-grey/10 text-pixel-grey border border-pixel-grey/30' 
  },
  not_awarded: {
    label: 'Ikke tildelt',
    className: 'bg-sunset-orange/20 text-sunset-orange border border-sunset-orange/40',
  },
}

export function SupplierStatusBadge({
  status,
  className = '',
}: SupplierStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-soft-sand/80 text-granite-grey border border-soft-sand',
  }

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium tracking-wide ${config.className} ${className}`}
      style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
    >
      {config.label}
    </span>
  )
}

