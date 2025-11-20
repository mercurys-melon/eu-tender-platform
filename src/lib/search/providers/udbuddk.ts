import { SearchParams, SearchResult, TenderItem } from '../types'

function mapParamsToUdbudDK(params: SearchParams) {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.cpv) params.cpv.forEach(c => sp.append('cpv', c))
  if (params.buyer) sp.set('buyer', params.buyer)
  if (params.publishedFrom) sp.set('publishedFrom', params.publishedFrom)
  if (params.publishedTo) sp.set('publishedTo', params.publishedTo)
  if (params.deadlineFrom) sp.set('deadlineFrom', params.deadlineFrom)
  if (params.deadlineTo) sp.set('deadlineTo', params.deadlineTo)
  if (params.procedure) params.procedure.forEach(p => sp.append('procedure', p))
  if (params.noticeType) params.noticeType.forEach(n => sp.append('noticeType', n))
  if (params.nuts) params.nuts.forEach(n => sp.append('nuts', n))
  if (params.minValue != null) sp.set('minValue', String(params.minValue))
  if (params.maxValue != null) sp.set('maxValue', String(params.maxValue))
  if (params.sortBy) sp.set('sortBy', params.sortBy)
  if (params.sortDir) sp.set('sortDir', params.sortDir || 'desc')
  sp.set('page', String(params.page ?? 1))
  sp.set('pageSize', String(params.pageSize ?? 20))
  return sp.toString()
}

export async function searchUdbudDK(params: SearchParams): Promise<SearchResult> {
  const base = process.env.UDBUDDK_API_URL
  const key = process.env.UDBUDDK_API_KEY

  // Fallback til mock, hvis vi ikke har credentials endnu:
  if (!base || !key) {
    const items: TenderItem[] = [
      {
        id: 'udbuddk:demo-1',
        source: 'udbuddk',
        title: 'Drift og vedligehold af IT-platform',
        buyer: 'Københavns Kommune',
        country: 'DK',
        cpv: ['72000000'],
        url: 'https://udbud.dk/',
        publishedAt: '2025-09-01',
        deadlineAt: '2025-10-01',
        estValue: 2500000,
        currency: 'DKK',
        procedure: 'Open',
        noticeType: 'ContractNotice',
      },
    ]
    return { total: items.length, page: params.page ?? 1, pageSize: params.pageSize ?? 20, items }
  }

  const qs = mapParamsToUdbudDK(params)
  const res = await fetch(`${base}/tenders?${qs}`, {
    headers: { 'authorization': `Bearer ${key}` },
    // Next cache hint (kan tweakes i route):
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`udbud.dk ${res.status}`)
  const data = await res.json()

  // Map -> TenderItem[]
  const items: TenderItem[] = (data.items || []).map((d: any) => ({
    id: `udbuddk:${d.id}`,
    source: 'udbuddk',
    title: d.title,
    buyer: d.buyer?.name ?? '',
    country: 'DK',
    nuts: d.nuts ?? [],
    cpv: d.cpv ?? [],
    url: d.url ?? `${base}/tenders/${d.id}`,
    publishedAt: d.publishedAt ?? d.datePublished,
    deadlineAt: d.deadlineAt ?? d.submissionDeadline,
    estValue: d.estimatedValue?.amount,
    currency: d.estimatedValue?.currency ?? 'DKK',
    procedure: d.procedure,
    noticeType: d.noticeType,
    raw: d,
  }))

  return {
    total: data.total ?? items.length,
    page: data.page ?? (params.page ?? 1),
    pageSize: data.pageSize ?? (params.pageSize ?? 20),
    items,
    facets: data.facets ?? undefined,
  }
}
