import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// CORS helpers (uændret)
// ---------------------------------------------------------------------------

function getAllowedOrigin(req: NextRequest): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const origin = req.headers.get('origin') ?? ''

  if (process.env.NODE_ENV === 'development') {
    const devOrigins = ['http://localhost:3000', 'http://localhost:3001']
    if (devOrigins.includes(origin)) return origin
    return devOrigins[0]
  }

  if (appUrl && origin === appUrl) return origin
  return appUrl ?? origin
}

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Idempotency-Key',
  'Access-Control-Max-Age': '86400',
} as const

function addCorsHeaders(res: NextResponse, allowedOrigin: string): NextResponse {
  res.headers.set('Access-Control-Allow-Origin', allowedOrigin)
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.headers.set(key, value)
  }
  return res
}

// ---------------------------------------------------------------------------
// Session refresh
//
// Bruger @supabase/ssr createServerClient med mutable response, så refreshede
// tokens skrives tilbage i cookies og ikke mistes. Returnerer session + response.
// ---------------------------------------------------------------------------

async function refreshSession(req: NextRequest): Promise<{
  session: { user: { id: string; email?: string } } | null
  response: NextResponse
}> {
  let response = NextResponse.next({ request: { headers: req.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          // Skriv til request (for downstream server components) og response (til browser)
          req.cookies.set(name, value)
          response = NextResponse.next({ request: { headers: req.headers } })
          response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
        },
        remove(name: string, options: Record<string, unknown>) {
          req.cookies.set(name, '')
          response = NextResponse.next({ request: { headers: req.headers } })
          response.cookies.set(name, '', options as Parameters<typeof response.cookies.set>[2])
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return { session, response }
}

// Role-opslag – kun kaldt når redirect-destination afhænger af rollen
async function getRoleForSession(
  req: NextRequest,
  userId: string
): Promise<string | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  return (profile as { role: string } | null)?.role ?? null
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(req: NextRequest) {
  const { pathname } = new URL(req.url)

  // ── 1. CORS: /api/* – KUN CORS-håndtering, ingen auth-logik ────────────
  if (pathname.startsWith('/api/')) {
    const allowedOrigin = getAllowedOrigin(req)
    if (req.method === 'OPTIONS') {
      return addCorsHeaders(new NextResponse(null, { status: 200 }), allowedOrigin)
    }
    return addCorsHeaders(NextResponse.next(), allowedOrigin)
  }

  // ── Skip Next internals & static assets ────────────────────────────────
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml') ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|txt)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  // ── 2. Eksisterende beskyttede ruter: KUN session-refresh, ingen redirect ─
  // /buyer, /supplier, /tenders, /create, /dashboard har deres egen
  // auth-logik i layouts/pages – middleware refresher kun cookies.
  const SESSION_REFRESH_PREFIXES = [
    '/buyer',
    '/supplier',
    '/tenders',
    '/create',
    '/dashboard',
  ]
  if (SESSION_REFRESH_PREFIXES.some((p) => pathname.startsWith(p))) {
    const { response } = await refreshSession(req)
    return response
  }

  // ── 3. (app)-ruter: session-refresh + gate til /login ──────────────────
  // /ordregiver og /tilbudsgiver kræver autentificering.
  if (pathname.startsWith('/ordregiver') || pathname.startsWith('/tilbudsgiver')) {
    const { session, response } = await refreshSession(req)
    if (!session) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return response
  }

  // ── 4. (auth)-ruter: redirect til rolle-dashboard hvis allerede logget ind ─
  // Forhindrer authenticated brugere i at se login/signup-sider.
  const AUTH_PATHS = new Set([
    '/login',
    '/signup',
    '/reset-password',
    '/update-password',
  ])
  if (AUTH_PATHS.has(pathname)) {
    const { session, response } = await refreshSession(req)
    if (session) {
      const role = await getRoleForSession(req, session.user.id)
      // Brug ny (app)-ruter for authenticated brugere; fallback til legacy
      const target =
        role === 'buyer'
          ? '/ordregiver'
          : role === 'supplier'
          ? '/tilbudsgiver'
          : '/tilbudsgiver'
      return NextResponse.redirect(new URL(target, req.url))
    }
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // CORS
    '/api/:path*',
    // (auth)-ruter (reverse-redirect)
    '/login',
    '/signup',
    '/reset-password',
    '/update-password',
    // Eksisterende beskyttede ruter (session-refresh kun)
    '/buyer',
    '/buyer/:path*',
    '/supplier',
    '/supplier/:path*',
    '/tenders/:path*',
    '/create/:path*',
    '/dashboard/:path*',
    // (app)-ruter (session-refresh + gate)
    '/ordregiver',
    '/ordregiver/:path*',
    '/tilbudsgiver',
    '/tilbudsgiver/:path*',
  ],
}
