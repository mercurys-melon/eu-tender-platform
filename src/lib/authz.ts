/**
 * Autorisations-helpers til API-routes og Server Components.
 *
 * Princip: RLS er den primære sikring, men alle routes der bruger service-role
 * (storage-upload, signerede URL'er) SKAL autorisere eksplicit her FØR kaldet.
 *
 * Ejerskab af et udbud (v1):
 *   - tenders.organisation_id er en organisation hvor brugeren er medlem, ELLER
 *   - legacy: tenders.entity_id = user.id (eksisterende RLS-policies på
 *     tender_documents/tender_questions/storage bruger stadig entity_id).
 * Nye udbud sætter begge felter, så begge veje er konsistente.
 */
import type { User } from '@supabase/supabase-js'
import { createClient } from './supabase/server'
import type { Database } from './supabase/types'

type TenderRow = Database['public']['Tables']['tenders']['Row']
type MemberRole = Database['public']['Enums']['organisation_member_role']

/** Roller der må oprette og administrere udbud på vegne af ordregiver. */
const TENDER_MANAGER_ROLES: MemberRole[] = ['owner', 'admin', 'editor']

/** Verificeret bruger (getUser rammer auth-serveren — getSession gør ikke). */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user
}

/** Organisations-id'er hvor brugeren er medlem (via SECURITY DEFINER-RPC). */
export async function getMyOrganisationIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_my_organisation_ids')
  if (error) {
    console.error('[authz] get_my_organisation_ids fejlede:', error.message)
    return []
  }
  return (data ?? []) as string[]
}

/**
 * Ordregiver-organisation brugeren må oprette udbud for.
 * Vælger default-organisationen hvis den findes, ellers første med manager-rolle.
 * Returnerer null hvis brugeren ikke er tilknyttet en ordregiver.
 */
export async function getBuyerOrganisationId(userId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organisation_members')
    .select('organisation_id, role, is_default, accepted_at')
    .eq('profile_id', userId)
    .not('accepted_at', 'is', null)

  if (error) {
    console.error('[authz] opslag i organisation_members fejlede:', error.message)
    return null
  }

  const eligible = (data ?? []).filter((m) => TENDER_MANAGER_ROLES.includes(m.role))
  const preferred = eligible.find((m) => m.is_default) ?? eligible[0]
  return preferred?.organisation_id ?? null
}

/** Rent ejerskabs-tjek mod en allerede hentet tender-række. */
export function isTenderManagedBy(
  tender: Pick<TenderRow, 'entity_id' | 'organisation_id'>,
  userId: string,
  myOrganisationIds: string[],
): boolean {
  if (tender.entity_id === userId) return true
  return !!tender.organisation_id && myOrganisationIds.includes(tender.organisation_id)
}

/**
 * Henter udbuddet og returnerer det KUN hvis brugeren administrerer det.
 * Bruger brugerens egen klient, så RLS også gælder for selve opslaget.
 */
export async function getManagedTender(
  userId: string,
  tenderId: string,
): Promise<TenderRow | null> {
  const supabase = await createClient()
  const { data: tender, error } = await supabase
    .from('tenders')
    .select('*')
    .eq('id', tenderId)
    .maybeSingle()

  if (error || !tender) return null

  const orgIds = await getMyOrganisationIds()
  return isTenderManagedBy(tender, userId, orgIds) ? tender : null
}

/** Bagudkompatibel boolean-variant. */
export async function assertTenderOwner(userId: string, tenderId: string): Promise<boolean> {
  return (await getManagedTender(userId, tenderId)) !== null
}

/**
 * Om et udbud er offentligt synligt for tilbudsgivere (dvs. ikke kladde/annulleret før publicering).
 * Holdes simpelt i v1; erstattes af tender_phases (#4) senere.
 */
export function isTenderPublic(tender: Pick<TenderRow, 'status'>): boolean {
  return tender.status !== 'draft'
}
