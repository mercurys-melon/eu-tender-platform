import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import type { Database } from './types'
import { cookies } from 'next/headers'
import { env } from '@/config/env'

const isEdge = () => typeof (globalThis as any).EdgeRuntime !== 'undefined'

export function getServerClient() {
  const cookieStore = cookies()
  return createSSRServerClient<Database>(
    env.supabase.url,
    env.supabase.anonKey,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set() {/* read-only in Server Components */},
        remove() {/* read-only in Server Components */},
      },
    }
  )
}

// Mutable cookie client for use in Server Actions where cookies() is writable
export function getActionClient() {
  const cookieStore = cookies()
  return createSSRServerClient<Database>(
    env.supabase.url,
    env.supabase.anonKey,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: Parameters<typeof cookieStore.set>[2]) {
          try { cookieStore.set(name, value, options) } catch {}
        },
        remove(name: string, options: Parameters<typeof cookieStore.set>[2]) {
          try { cookieStore.set(name, '', options) } catch {}
        },
      },
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
