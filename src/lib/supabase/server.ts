import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import type { Database } from './types'
import { cookies } from 'next/headers'
import { env } from '@/config/env'

const isEdge = () => typeof (globalThis as any).EdgeRuntime !== 'undefined'

// Next 15+: cookies() er asynkron, derfor er klient-fabrikkerne async og skal awaites.
export async function getServerClient() {
  const cookieStore = await cookies()
  return createSSRServerClient<Database>(
    env.supabase.url,
    env.supabase.anonKey,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        // Bevidst no-op: read-only i Server Components. Session-refresh sker i middleware.
        // setAll angives eksplicit (frem for at udelade den), så @supabase/ssr ikke logger advarsler.
        setAll() {/* read-only in Server Components */},
      },
    }
  )
}

// Mutable cookie client for use in Server Actions where cookies() is writable
export async function getActionClient() {
  const cookieStore = await cookies()
  return createSSRServerClient<Database>(
    env.supabase.url,
    env.supabase.anonKey,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          // Fjernelse kommer som value '' + maxAge 0 i options (tidl. remove()).
          for (const { name, value, options } of cookiesToSet) {
            try { cookieStore.set(name, value, options) } catch {}
          }
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
