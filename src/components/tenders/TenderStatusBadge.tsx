import type { TenderStatus } from '@/lib/tenders/types'

interface TenderStatusBadgeProps {
  status: TenderStatus
  className?: string
}

const statusConfig: Record<
  TenderStatus,
  { label: string; className: string }
> = {
  // Neutral / Soft Sand
  draft: { 
    label: 'Udkast', 
    className: 'bg-soft-sand/80 text-granite-grey border border-soft-sand' 
  },
  closed: { 
    label: 'Afsluttet', 
    className: 'bg-soft-sand/80 text-granite-grey border border-soft-sand' 
  },
  // Primært blå (XP Sky Blue / Digital Navy)
  published: { 
    label: 'Offentliggjort', 
    className: 'bg-xp-sky-blue/10 text-digital-navy border border-xp-sky-blue/30' 
  },
  bidding: { 
    label: 'Tilbudsfasen', 
    className: 'bg-xp-sky-blue/10 text-digital-navy border border-xp-sky-blue/30' 
  },
  // Orange/gul (mellemstatus)
  prequalification: {
    label: 'Prækvalifikation',
    className: 'bg-sunset-orange/10 text-sunset-orange border border-sunset-orange/30',
  },
  evaluation: { 
    label: 'Evalueres', 
    className: 'bg-sunset-orange/10 text-sunset-orange border border-sunset-orange/30' 
  },
  // Grøn (Pixel Grey - succes)
  awarded: { 
    label: 'Tildelt', 
    className: 'bg-pixel-grey/10 text-pixel-grey border border-pixel-grey/30' 
  },
  // Rød/orange (Sunset Orange - negativ)
  cancelled: { 
    label: 'Annulleret', 
    className: 'bg-sunset-orange/20 text-sunset-orange border border-sunset-orange/40' 
  },
}

export function TenderStatusBadge({ status, className = '' }: TenderStatusBadgeProps) {
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

