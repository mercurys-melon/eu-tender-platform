/**
 * ⚠️ Ikke verificeret mod rigtigt API endnu - mock fallback aktiv
 */
import { env } from '@/config/env'
import { SearchParams, SearchResult, TenderItem } from '../types'

function mapParamsToTED(params: SearchParams) {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.cpv) params.cpv.forEach(c => sp.append('cpv', c))
  if (params.country) params.country.forEach(c => sp.append('country', c))
  if (params.language) params.language.forEach(l => sp.append('lang', l))
  if (params.nuts) params.nuts.forEach(n => sp.append('nuts', n))
  if (params.procedure) params.procedure.forEach(p => sp.append('procedure', p))
  if (params.noticeType) params.noticeType.forEach(n => sp.append('noticeType', n))
  if (params.publishedFrom) sp.set('publishedFrom', params.publishedFrom)
  if (params.publishedTo) sp.set('publishedTo', params.publishedTo)
  if (params.deadlineFrom) sp.set('deadlineFrom', params.deadlineFrom)
  if (params.deadlineTo) sp.set('deadlineTo', params.deadlineTo)
  if (params.minValue != null) sp.set('minValue', String(params.minValue))
  if (params.maxValue != null) sp.set('maxValue', String(params.maxValue))
  if (params.currency) sp.set('currency', params.currency)
  if (params.sortBy) sp.set('sortBy', params.sortBy)
  if (params.sortDir) sp.set('sortDir', params.sortDir || 'desc')
  sp.set('page', String(params.page ?? 1))
  sp.set('pageSize', String(params.pageSize ?? 20))
  return sp.toString()
}

export async function searchTED(params: SearchParams): Promise<SearchResult> {
  const base = env.ted.baseUrl
  const key = env.ted.apiKey

  if (!base || !key) {
    const items: TenderItem[] = [
      {
        id: 'ted:demo-1',
        source: 'ted',
        title: 'Framework for cleaning services',
        buyer: 'Region Midtjylland',
        country: 'DK',
        cpv: ['90910000'],
        url: 'https://ted.europa.eu/',
        publishedAt: '2025-09-10',
        deadlineAt: '2025-11-15',
        estValue: 1200000,
        currency: 'EUR',
        procedure: 'Restricted',
        noticeType: 'ContractNotice',
      },
    ]
    return { total: items.length, page: params.page ?? 1, pageSize: params.pageSize ?? 20, items }
  }

  const qs = mapParamsToTED(params)
  const res = await fetch(`${base}/notices?${qs}`, {
    headers: { 'authorization': `Bearer ${key}` },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`TED ${res.status}`)
  const data = await res.json()

  const items: TenderItem[] = (data.items || []).map((d: any) => ({
    id: `ted:${d.id}`,
    source: 'ted',
    title: d.title,
    buyer: d.buyer?.name ?? '',
    country: d.country,
    nuts: d.nuts ?? [],
    cpv: d.cpv ?? [],
    url: d.url ?? `${base}/notices/${d.id}`,
    publishedAt: d.publishedAt,
    deadlineAt: d.deadlineAt,
    estValue: d.estimatedValue?.amount,
    currency: d.estimatedValue?.currency ?? 'EUR',
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
