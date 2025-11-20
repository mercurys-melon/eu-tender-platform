import { SearchParams, SearchResult, TenderItem } from './types'

export function mergeResults(results: SearchResult[], params: SearchParams): SearchResult {
  const items = results.flatMap(r => r.items)
  
  // Deduplicate by URL eller (source,id)
  const seen = new Set<string>()
  const deduped: TenderItem[] = []
  for (const it of items) {
    const key = it.url || `${it.source}:${it.id}`
    if (!seen.has(key)) { 
      seen.add(key)
      deduped.push(it) 
    }
  }

  // Sortering
  const dir = params.sortDir === 'asc' ? 1 : -1
  const sortBy = params.sortBy ?? 'published'
  deduped.sort((a, b) => {
    const get = (x: TenderItem) => {
      if (sortBy === 'deadline') return x.deadlineAt || ''
      if (sortBy === 'value') return x.estValue ?? 0
      if (sortBy === 'relevance') {
        // Simple relevance scoring based on query match
        if (!params.q) return 0
        const query = params.q.toLowerCase()
        let score = 0
        if (x.title.toLowerCase().includes(query)) score += 3
        if (x.buyer.toLowerCase().includes(query)) score += 2
        if (x.cpv?.some(cpv => cpv.includes(query))) score += 1
        return score
      }
      return x.publishedAt || ''                  // default published
    }
    const A = get(a), B = get(b)
    
    // Handle different data types for comparison
    if (typeof A === 'number' && typeof B === 'number') {
      return (A - B) * dir
    }
    if (typeof A === 'string' && typeof B === 'string') {
      return (A > B ? 1 : A < B ? -1 : 0) * dir
    }
    return 0
  })

  // Pagination (server-side efter merge)
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 20
  const start = (page - 1) * pageSize
  const paged = deduped.slice(start, start + pageSize)

  // Generate facets for filtering
  const facets: Record<string, Array<{ key: string; count: number }>> = {}
  
  // CPV facets
  const cpvCounts = new Map<string, number>()
  deduped.forEach(item => {
    item.cpv?.forEach(cpv => {
      cpvCounts.set(cpv, (cpvCounts.get(cpv) || 0) + 1)
    })
  })
  facets.cpv = Array.from(cpvCounts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20) // Top 20 CPV codes

  // Country facets
  const countryCounts = new Map<string, number>()
  deduped.forEach(item => {
    if (item.country) {
      countryCounts.set(item.country, (countryCounts.get(item.country) || 0) + 1)
    }
  })
  facets.country = Array.from(countryCounts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)

  // Procedure facets
  const procedureCounts = new Map<string, number>()
  deduped.forEach(item => {
    if (item.procedure) {
      procedureCounts.set(item.procedure, (procedureCounts.get(item.procedure) || 0) + 1)
    }
  })
  facets.procedure = Array.from(procedureCounts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)

  return { 
    total: deduped.length, 
    page, 
    pageSize, 
    items: paged,
    facets 
  }
}
