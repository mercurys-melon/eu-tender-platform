import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionAndRoleForMiddleware } from '@/lib/auth/session'

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

  // 3) Role-based protection for /buyer and /supplier routes
  if (pathname.startsWith('/buyer') || pathname.startsWith('/supplier')) {
    const { session, role } = await getSessionAndRoleForMiddleware(req)

    // If no session, redirect to login
    if (!session) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // If no role, redirect to login (user needs to set up profile)
    if (!role) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Role-based access control
    if (pathname.startsWith('/buyer')) {
      if (role !== 'buyer') {
        // Wrong role - redirect to their own area only if they have a valid role
        if (role === 'supplier') {
          return NextResponse.redirect(new URL('/supplier', req.url))
        }
        // Unknown role - redirect to login
        const loginUrl = new URL('/login', req.url)
        return NextResponse.redirect(loginUrl)
      }
    } else if (pathname.startsWith('/supplier')) {
      if (role !== 'supplier') {
        // Wrong role - redirect to their own area only if they have a valid role
        if (role === 'buyer') {
          return NextResponse.redirect(new URL('/buyer', req.url))
        }
        // Unknown role - redirect to login
        const loginUrl = new URL('/login', req.url)
        return NextResponse.redirect(loginUrl)
      }
    }
  }

  // 4) Other protected routes (tenders, create, dashboard) - check session only
  const PROTECTED_PREFIXES = ['/tenders', '/create', '/dashboard']
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  
  if (isProtected) {
    const { session } = await getSessionAndRoleForMiddleware(req)
    
    if (!session) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
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