import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/roles'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'

export interface SessionData {
  session: {
    user: {
      id: string
      email?: string
    }
  } | null
  role: UserRole | null
  userId: string | null
}

/**
 * Get session and role for server components and API routes
 * Uses Supabase SSR client with cookies
 */
export async function getSessionAndRole(): Promise<SessionData> {
  const supabase = createClient()

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !session) {
    return {
      session: null,
      role: null,
      userId: null,
    }
  }

  // Get user role from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle()

  const role = (profile?.role as UserRole) || null

  return {
    session: {
      user: {
        id: session.user.id,
        email: session.user.email,
      },
    },
    role,
    userId: session.user.id,
  }
}

/**
 * Get session and role for middleware
 * Uses Supabase SSR client with request cookies
 */
export async function getSessionAndRoleForMiddleware(
  req: NextRequest
): Promise<SessionData> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set() {
          // In middleware, we can't set cookies
        },
        remove() {
          // In middleware, we can't remove cookies
        },
      },
    }
  )

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !session) {
    return {
      session: null,
      role: null,
      userId: null,
    }
  }

  // Get user role from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle()

  const role = (profile?.role as UserRole) || null

  return {
    session: {
      user: {
        id: session.user.id,
        email: session.user.email,
      },
    },
    role,
    userId: session.user.id,
  }
}

/**
 * Require authentication - throws error if not authenticated
 * Use in server components and API routes
 */
export async function requireAuth(): Promise<SessionData> {
  const sessionData = await getSessionAndRole()

  if (!sessionData.session || !sessionData.userId) {
    throw new Error('Unauthorized')
  }

  return sessionData
}

/**
 * Require specific role - throws error if not authenticated or wrong role
 * Use in server components and API routes
 */
export async function requireRole(requiredRole: UserRole): Promise<SessionData> {
  const sessionData = await requireAuth()

  if (sessionData.role !== requiredRole) {
    throw new Error(`Forbidden: Required role ${requiredRole}`)
  }

  return sessionData
}

