import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const url = new URL(req.url)
  const { pathname } = url

  // 1) Skip Next internals & statiske assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|txt)$/)
  ) {
    return NextResponse.next()
  }

  // 2) Offentlige ruter (må ALDRIG tvinges til /login)
  const PUBLIC_PATHS = new Set([
    '/', '/about', '/contact', '/marketing', '/demo',
    '/login', '/register', '/reset-password', '/update-password'
  ])
  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith('/marketing')) {
    return NextResponse.next()
  }

  // 3) Beskyt kun disse "private" scope-ruter
  const PROTECTED_PREFIXES = ['/tenders', '/create', '/dashboard', '/supplier', '/buyer']

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  // DEBUG: Allow access to all protected routes in development mode for testing
  if (process.env.NODE_ENV === 'development') {
    console.log('DEBUG: Allowing access to protected routes in development mode')
    return NextResponse.next()
  }

  // 4) In production, redirect to login for protected routes
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('redirectTo', pathname)
  return NextResponse.redirect(loginUrl)
}

// Matcher: beskyt kun områder – ikke /login og /register
export const config = {
  matcher: [
    '/tenders/:path*',
    '/create/:path*',
    '/dashboard/:path*',
    '/supplier/:path*',
    '/buyer/:path*',
  ],
} 