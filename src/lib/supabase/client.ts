import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'
import { env } from '@/config/env'

// Browser client til Client Components
export const supabase = () =>
  createBrowserClient<Database>(env.supabase.url, env.supabase.anonKey)
