type BidStatus = 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'under_evaluation' | 'winner' | 'not_awarded'

interface BidStatusBadgeProps {
  status: BidStatus
  className?: string
}

const statusConfig: Record<
  BidStatus,
  { label: string; className: string }
> = {
  submitted: { 
    label: 'Indsendt', 
    className: 'bg-xp-sky-blue/10 text-digital-navy border border-xp-sky-blue/30' 
  },
  under_review: { 
    label: 'Under vurdering', 
    className: 'bg-sunset-orange/10 text-sunset-orange border border-sunset-orange/30' 
  },
  accepted: { 
    label: 'Accepteret', 
    className: 'bg-pixel-grey/10 text-pixel-grey border border-pixel-grey/30' 
  },
  rejected: { 
    label: 'Afvist', 
    className: 'bg-sunset-orange/20 text-sunset-orange border border-sunset-orange/40' 
  },
  under_evaluation: {
    label: 'Under evaluering',
    className: 'bg-sunset-orange/10 text-sunset-orange border border-sunset-orange/30'
  },
  winner: {
    label: 'Vinder',
    className: 'bg-pixel-grey/10 text-pixel-grey border border-pixel-grey/30'
  },
  not_awarded: {
    label: 'Ikke tildelt',
    className: 'bg-sunset-orange/20 text-sunset-orange border border-sunset-orange/40'
  },
}

export function BidStatusBadge({ status, className = '' }: BidStatusBadgeProps) {
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

