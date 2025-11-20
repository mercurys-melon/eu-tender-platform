export type Provider = 'udbuddk' | 'ted'

export type SortBy = 'relevance' | 'published' | 'deadline' | 'value'
export type SortDir = 'asc' | 'desc'

export interface SearchParams {
  q?: string
  providers?: Provider[]            // default: ['udbuddk','ted']
  page?: number                     // 1-based
  pageSize?: number                 // default: 20
  sortBy?: SortBy
  sortDir?: SortDir
  // Filtre (match de to kilder så vidt muligt)
  cpv?: string[]                    // CPV-koder
  buyer?: string                    // ordregiver-navn
  nuts?: string[]                   // NUTS/region
  country?: string[]                // ISO landekoder (TED)
  noticeType?: string[]             // fx 'contract', 'prior-information', 'award' osv.
  procedure?: string[]              // proceduretyper
  minValue?: number                 // anslået værdi
  maxValue?: number
  currency?: string                 // fx 'DKK', 'EUR'
  publishedFrom?: string            // ISO dato
  publishedTo?: string
  deadlineFrom?: string
  deadlineTo?: string
  language?: string[]               // sprog (TED)
}

export interface TenderItem {
  id: string                        // stabilt per provider (brug provider prefix: 'udbuddk:xxx', 'ted:yyy')
  source: Provider
  title: string
  buyer: string
  country?: string
  nuts?: string[]
  cpv?: string[]
  url: string
  publishedAt?: string             // ISO
  deadlineAt?: string              // ISO
  procedure?: string
  noticeType?: string
  estValue?: number
  currency?: string
  raw?: any                        // original payload for debug
}

export interface SearchResult {
  total: number
  page: number
  pageSize: number
  items: TenderItem[]
  facets?: Record<string, Array<{ key: string; count: number }>>
}
