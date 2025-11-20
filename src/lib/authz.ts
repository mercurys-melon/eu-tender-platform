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
  const supabase = createClient()
  
  // Check if user is authenticated
  if (!userId) {
    return 'anonymous'
  }

  // Check if user is a supplier
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (supplier) {
    return 'supplier'
  }

  // Check if user owns any tenders (is an entity)
  const { data: tender } = await supabase
    .from('tenders')
    .select('id')
    .eq('entity_id', userId)
    .limit(1)
    .single()

  if (tender) {
    return 'owner'
  }

  return 'anonymous'
}

export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
