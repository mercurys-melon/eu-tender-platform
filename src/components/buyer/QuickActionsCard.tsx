import Link from 'next/link'

// Simple line icons in Pixel Grey stroke, following brand guide
const FilePlusIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
)

const FolderIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
)

const FileTextIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const SettingsIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

interface QuickAction {
  href: string
  label: string
  icon: React.ReactNode
}

const quickActions: QuickAction[] = [
  {
    href: '/tenders/new',
    label: 'Opret nyt udbud',
    icon: <FilePlusIcon />,
  },
  {
    href: '/buyer/tenders',
    label: 'Se alle udbud',
    icon: <FolderIcon />,
  },
  {
    href: '/buyer/espd-templates',
    label: 'ESPD-skabeloner',
    icon: <FileTextIcon />,
  },
  {
    href: '/buyer/settings',
    label: 'Organisation & brugere',
    icon: <SettingsIcon />,
  },
]

export function QuickActionsCard() {
  return (
    <div className="card p-6">
      <h2 className="text-h3 mb-4" style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>
        Hurtige handlinger
      </h2>
      
      <div className="space-y-3">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-3 p-3 rounded-[20px] border border-soft-sand hover:border-xp-sky-blue/30 hover:bg-xp-sky-blue/5 transition-all group"
          >
            <div className="text-pixel-grey group-hover:text-xp-sky-blue transition-colors">
              {action.icon}
            </div>
            <span
              className="text-digital-navy group-hover:text-xp-sky-blue transition-colors font-medium"
              style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
            >
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

