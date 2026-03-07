'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface TenderTabsProps {
  tenderId: string
}

const tabs = [
  { id: 'overview', label: 'Oversigt', href: (id: string) => `/tenders/${id}`, testId: 'tender-tab-overview' },
  { id: 'documents', label: 'Dokumenter', href: (id: string) => `/tenders/${id}/documents`, testId: 'tender-tab-documents' },
  { id: 'qna', label: 'Spørgsmål & svar', href: (id: string) => `/tenders/${id}/qna`, testId: 'tender-tab-qna' },
  { id: 'bids', label: 'Tilbud', href: (id: string) => `/tenders/${id}/bids`, testId: 'tender-tab-bids' },
]

export function TenderTabs({ tenderId }: TenderTabsProps) {
  const pathname = usePathname()

  return (
    <div className="border-b border-soft-sand mb-6">
      <nav className="flex gap-6" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
        {tabs.map((tab) => {
          const href = tab.href(tenderId)
          const isActive = pathname === href || (tab.id === 'overview' && pathname === `/tenders/${tenderId}`)
          
          return (
            <Link
              key={tab.id}
              href={href}
              className={`px-4 py-3 border-b-2 transition-colors ${
                isActive
                  ? 'border-xp-sky-blue text-digital-navy font-medium'
                  : 'border-transparent text-granite-grey hover:text-digital-navy hover:border-soft-sand'
              }`}
              data-testid={tab.testId}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

