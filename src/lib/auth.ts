import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getServerClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

// React.cache() deduplicates calls within a single request across layouts/components
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = getServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser()
  if (!user) return null
  const supabase = getServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  return data
})

export const getSession = cache(async () => {
  const supabase = getServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
})

// Redirects to /login if not authenticated – use in Server Components
export async function requireUser(): Promise<User> {
  const user = await getUser()
  if (!user) redirect('/login')
  return user
}

// Redirects to the other role's dashboard if active_role doesn't match
export async function requireActiveRole(role: 'buyer' | 'supplier'): Promise<Profile> {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.active_role !== role) {
    redirect(role === 'buyer' ? '/tilbudsgiver' : '/ordregiver')
  }
  return profile
}
