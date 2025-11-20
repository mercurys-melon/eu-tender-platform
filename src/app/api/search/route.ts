import { NextRequest } from 'next/server'
import { mergeResults } from '@/lib/search/merge'
import { searchUdbudDK } from '@/lib/search/providers/udbuddk'
import { searchTED } from '@/lib/search/providers/ted'
import { SearchParams, Provider } from '@/lib/search/types'

// Simple IP-based limiter (fast window) – in-memory
const WINDOW_MS = 60_000
const MAX_REQ = 60
const bucket = new Map<string, { count: number; ts: number }>()

function limit(ip: string) {
  const now = Date.now()
  const r = bucket.get(ip)
  if (!r || now - r.ts > WINDOW_MS) {
    bucket.set(ip, { count: 1, ts: now })
    return true
  }
  if (r.count >= MAX_REQ) return false
  r.count++
  return true
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!limit(ip)) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429, headers: { 'content-type': 'application/json' }
    })
  }

  const url = new URL(req.url)
  const getA = (k: string) => url.searchParams.getAll(k)
  const get = (k: string) => url.searchParams.get(k) || undefined

  const params: SearchParams = {
    q: get('q'),
    providers: (getA('providers') as Provider[]) || ['udbuddk','ted'],
    page: get('page') ? Number(get('page')) : 1,
    pageSize: get('pageSize') ? Number(get('pageSize')) : 20,
    sortBy: (get('sortBy') as any) || 'published',
    sortDir: (get('sortDir') as any) || 'desc',
    cpv: getA('cpv'),
    buyer: get('buyer'),
    nuts: getA('nuts'),
    country: getA('country'),
    noticeType: getA('noticeType'),
    procedure: getA('procedure'),
    minValue: get('minValue') ? Number(get('minValue')) : undefined,
    maxValue: get('maxValue') ? Number(get('maxValue')) : undefined,
    currency: get('currency') || undefined,
    publishedFrom: get('publishedFrom'),
    publishedTo: get('publishedTo'),
    deadlineFrom: get('deadlineFrom'),
    deadlineTo: get('deadlineTo'),
    language: getA('language'),
  }

  const promises = []
  if (params.providers?.includes('udbuddk')) promises.push(searchUdbudDK(params))
  if (params.providers?.includes('ted')) promises.push(searchTED(params))
  const results = await Promise.all(promises)
  const merged = mergeResults(results, params)

  // Caching-hints
  const body = JSON.stringify(merged)
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // klient/proxy cache (kan justeres)
      'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=300',
    },
  })
}
