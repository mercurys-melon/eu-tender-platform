import { createClient } from './supabase/server'

export async function assertTenderOwner(userId: string, tenderId: string): Promise<boolean> {
  const supabase = createClient()
  
  const { data: tender, error } = await supabase
    .from('tenders')
    .select('entity_id')
    .eq('id', tenderId)
    .single()

  if (error || !tender) {
    return false
  }

  return tender.entity_id === userId
}

export async function getUserRole(userId: string): Promise<'owner' | 'supplier' | 'anonymous'> {
  if (!userId) {
    return 'anonymous'
  }
  const supabase = createClient()
  // Roller udledes nu fra profiles.role (migration 20260417120000).
  // 'buyer' i profiles mapper til 'owner' i denne funktion for bagudkompatibilitet
  // med eksisterende call-sites. Terminologi-skift udskudt til senere refaktor.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  if (profile?.role === 'supplier') {
    return 'supplier'
  }
  if (profile?.role === 'buyer') {
    return 'owner'
  }
  return 'anonymous'
}

export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
