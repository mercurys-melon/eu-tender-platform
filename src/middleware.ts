import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionAndRoleForMiddleware } from '@/lib/auth/session'

// ---------------------------------------------------------------------------
// CORS helpers
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
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(req: NextRequest) {
  const url = new URL(req.url)
  const { pathname } = url

  // ── CORS: handle all /api/* routes before any other logic ──────────────
  if (pathname.startsWith('/api/')) {
    const allowedOrigin = getAllowedOrigin(req)

    // Preflight — respond immediately with 200 + CORS headers
    if (req.method === 'OPTIONS') {
      const preflight = new NextResponse(null, { status: 200 })
      return addCorsHeaders(preflight, allowedOrigin)
    }

    // All other API requests — pass through but attach CORS headers
    const res = NextResponse.next()
    return addCorsHeaders(res, allowedOrigin)
  }

  // ── Skip Next internals & static assets ────────────────────────────────
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|txt)$/)
  ) {
    return NextResponse.next()
  }

  // ── Public routes (never forced to /login) ─────────────────────────────
  const PUBLIC_PATHS = new Set([
    '/', '/about', '/contact', '/marketing', '/demo',
    '/login', '/register', '/reset-password', '/update-password',
  ])
  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith('/marketing')) {
    return NextResponse.next()
  }

  // ── Role-based protection for /buyer and /supplier routes ──────────────
  if (pathname.startsWith('/buyer') || pathname.startsWith('/supplier')) {
    const { session, role } = await getSessionAndRoleForMiddleware(req)

    if (!session) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (!role) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (pathname.startsWith('/buyer')) {
      if (role !== 'buyer') {
        if (role === 'supplier') return NextResponse.redirect(new URL('/supplier', req.url))
        return NextResponse.redirect(new URL('/login', req.url))
      }
    } else if (pathname.startsWith('/supplier')) {
      if (role !== 'supplier') {
        if (role === 'buyer') return NextResponse.redirect(new URL('/buyer', req.url))
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }
  }

  // ── Other protected routes ──────────────────────────────────────────────
  const PROTECTED_PREFIXES = ['/tenders', '/create', '/dashboard']
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const { session } = await getSessionAndRoleForMiddleware(req)
    if (!session) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',
    '/tenders/:path*',
    '/create/:path*',
    '/dashboard/:path*',
    '/supplier/:path*',
    '/buyer/:path*',
  ],
}
