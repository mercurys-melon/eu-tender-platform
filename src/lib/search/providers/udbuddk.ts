/**
 * Udbud.dk search provider
 *
 * VIGTIGT: Udbud.dk's ERST API (openapi-udbud.yml) har intet søge-endpoint.
 * De to tilgængelige datahentnings-endpoints er:
 *   - GET /ekstern-data/bekendtgoerelse/v1/{noticeId}/{noticeVersion}  (enkelt notice)
 *   - GET /ekstern-data/bekendtgoerelse/v1/fraKilde/{kilde}            (bulk-sync, ikke søgning)
 *
 * TODO (afventer afklaring med ERST — spørg system@udbud.dk):
 *   Er der et søge-API til fritekst/CPV/buyer-filtrering?
 *   Alternativ arkitektur: periodisk sync via fraKilde/{DKUDBUD} + lokal indeksering i Supabase.
 *   Det sidstnævnte er den typiske tilgang for integrations-platforme og muliggør
 *   rigere søgning end ERST's API alene kan levere.
 *
 * Nuværende implementation: returnerer mock-data i alle tilfælde.
 * Reel søgning implementeres som separat feature efter ERST-afklaring.
 */

import { env } from '@/config/env'
import { SearchParams, SearchResult, TenderItem } from '../types'

const MOCK_ITEMS: TenderItem[] = [
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

export async function searchUdbudDK(params: SearchParams): Promise<SearchResult> {
  const hasCredentials = !!(env.udbudDk.basicUser && env.udbudDk.basicPass)

  if (process.env.NODE_ENV === 'development') {
    if (!hasCredentials) {
      console.log(
        '[UDBUD-DK search] ingen credentials konfigureret — returnerer mock-data ' +
          '(sæt UDBUD_DK_BASIC_USER og UDBUD_DK_BASIC_PASS i .env.local)',
      )
    } else {
      console.log(
        '[UDBUD-DK search] credentials konfigureret, men søge-API eksisterer ikke i ERST-spec — ' +
          'returnerer mock-data (se TODO i toppen af filen)',
      )
    }
  }

  // Søge-API mangler i ERST's spec — returnerer mock indtil arkitektur er besluttet.
  // next: { revalidate: 300 } er irrelevant her (ingen fetch), men bevares som kommentar
  // så den ikke glemmes når reel implementation bygges.
  // next revalidate: 300
  return {
    total: MOCK_ITEMS.length,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    items: MOCK_ITEMS,
  }
}
