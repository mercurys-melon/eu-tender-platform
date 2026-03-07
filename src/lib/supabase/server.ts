import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import type { Database } from './types'
import { cookies, headers } from 'next/headers'
import { env } from '@/config/env'

const isEdge = () => typeof (globalThis as any).EdgeRuntime !== 'undefined'

export function getServerClient() {
  const cookieStore = cookies()
  const headerList = headers()
  return createSSRServerClient<Database>(
    env.supabase.url,
    env.supabase.anonKey,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set() {/* handled by Next */},
        remove() {/* handled by Next */},
      },
      global: { headers: Object.fromEntries(headerList) as any },
    }
  )
}

// Compatibility alias
export const createClient = getServerClient

export function getServiceClient() {
  if (!env.supabase.serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
  return createSupabaseClient<Database>(env.supabase.url, env.supabase.serviceKey!)
}

// Compatibility alias
export const createServiceClient = getServiceClient
