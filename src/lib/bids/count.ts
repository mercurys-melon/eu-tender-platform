import type { getServerClient } from '@/lib/supabase/server'

type ServerClient = Awaited<ReturnType<typeof getServerClient>>

/**
 * Antal modtagne tilbud på et udbud, set fra ordregiver.
 *
 * Bruger RPC'en get_bid_count_for_tender (migration 20261112120000), fordi
 * bids-RLS (korrekt) skjuler tilbuddene for ordregiver indtil fristen.
 * RPC'en udleverer KUN et antal — hverken identitet eller tidspunkter
 * (BEK 1572: fortrolighed indtil åbning). Ikke-medlemmer af udbuddets
 * organisation får 0.
 *
 * Ved fejl logges og returneres 0, så oversigtssiderne stadig kan vises.
 */
export async function getBidCount(supabase: ServerClient, tenderId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_bid_count_for_tender', {
    p_tender_id: tenderId,
  })

  if (error) {
    console.error('[getBidCount] get_bid_count_for_tender fejlede:', error.code, error.message)
    return 0
  }

  return data ?? 0
}
