import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'
import { isEdgeRuntime } from '@/lib/utils/runtime'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

export function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options?: { path?: string; expires?: Date }) {
          try {
            cookieStore.set(name, value, options)
          } catch {
            // cookies() kan være read-only i server components
          }
        },
        remove(name: string) {
          try {
            cookieStore.delete(name)
          } catch {
            // cookies() kan være read-only i server components
          }
        },
      },
    }
  )
}

let serviceClient: SupabaseClient<Database> | null = null

export function createServiceClient() {
  if (isEdgeRuntime()) {
    throw new Error('createServiceClient is not supported in the Edge runtime')
  }

  if (!serviceClient) {
    serviceClient = createSupabaseClient<Database>(
      requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }

  return serviceClient
}
