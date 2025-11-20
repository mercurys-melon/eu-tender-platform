'use client'

import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder-anon-key'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if ((!supabaseUrl || !supabaseAnonKey) && process.env.NODE_ENV === 'development') {
  console.warn(
    '⚠️ Supabase is not configured. Authentication features will not work. Please update your .env.local file with real Supabase credentials.'
  )
}

export const supabase = createClient<Database>(
  supabaseUrl || PLACEHOLDER_URL,
  supabaseAnonKey || PLACEHOLDER_KEY,
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);