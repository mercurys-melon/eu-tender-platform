'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import type { Tender } from '@/lib/tenders/types'
import { TenderStatusBadge } from '@/components/tenders/TenderStatusBadge'

interface TenderWithStats extends Tender {
  bids_count?: number
  participants_count?: number
}

interface TenderSectionProps {
  title: string
  description: string
  tenders: TenderWithStats[]
  emptyMessage: string
  primaryAction?: (tender: TenderWithStats) => { label: string; href: string }
  headerAction?: React.ReactNode
}

type SortOption = 'deadline' | 'created' | 'title'

const CalendarIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const SearchIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

export function TenderSection({ 
  title, 
  description, 
  tenders, 
  emptyMessage,
  primaryAction,
  headerAction
}: TenderSectionProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('created')

  const filteredAndSorted = useMemo(() => {
    // Filter by search query
    let filtered = tenders.filter(tender =>
      tender.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'deadline':
          const aDeadline = a.submission_deadline ? new Date(a.submission_deadline).getTime() : 0
          const bDeadline = b.submission_deadline ? new Date(b.submission_deadline).getTime() : 0
          return aDeadline - bDeadline
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'title':
          return a.title.localeCompare(b.title, 'da')
        default:
          return 0
      }
    })

    return filtered
  }, [tenders, searchQuery, sortBy])

  return (
    <section className="card p-6">
      <div className={`mb-4 ${headerAction ? 'flex items-center justify-between' : ''}`}>
        <div>
          <h2 className="text-h3 mb-1" style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>
            {title}
          </h2>
          <p className="text-sm text-granite-grey" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
            {description}
          </p>
        </div>
        {headerAction && (
          <div>
            {headerAction}
          </div>
        )}
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pixel-grey" />
          <input
            type="text"
            placeholder="Søg efter titel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full border border-soft-sand focus:outline-none focus:ring-2 focus:ring-xp-sky-blue/50 focus:border-xp-sky-blue transition-all"
            style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
          />
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-4 py-2 rounded-full border border-soft-sand focus:outline-none focus:ring-2 focus:ring-xp-sky-blue/50 focus:border-xp-sky-blue transition-all bg-white"
          style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
        >
          <option value="deadline">Nærmeste tilbudsfrist først</option>
          <option value="created">Nyeste udbud først</option>
          <option value="title">A–Å</option>
        </select>
      </div>

      {/* Tender List */}
      {filteredAndSorted.length > 0 ? (
        <div className="space-y-4">
          {filteredAndSorted.map(tender => {
            const action = primaryAction ? primaryAction(tender) : { label: 'Se udbud', href: `/tenders/${tender.id}` }
            return (
              <div
                key={tender.id}
                className="border border-soft-sand rounded-[20px] p-5 hover:border-xp-sky-blue/30 transition-colors bg-white"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-digital-navy mb-2" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                      {tender.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-granite-grey mb-2">
                      <TenderStatusBadge status={tender.status as any} />
                      {tender.submission_deadline && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4 text-pixel-grey" />
                          Tilbudsfrist: {format(new Date(tender.submission_deadline), 'dd. MMM yyyy', { locale: da })}
                        </span>
                      )}
                    </div>
                    {(tender.participants_count !== undefined || tender.bids_count !== undefined) && (
                      <div className="text-sm text-granite-grey">
                        {tender.participants_count !== undefined && tender.participants_count > 0 && (
                          <span>Deltagere: {tender.participants_count}</span>
                        )}
                        {tender.bids_count !== undefined && tender.bids_count > 0 && (
                          <span className={tender.participants_count ? ' • ' : ''}>
                            Tilbud: {tender.bids_count}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Link href={action.href} className="btn-primary text-sm px-4 py-2 inline-block">
                  {action.label}
                </Link>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-soft-sand rounded-[20px] bg-soft-sand/30">
          <p className="text-granite-grey" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
            {emptyMessage}
          </p>
        </div>
      )}
    </section>
  )
}

