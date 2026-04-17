'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { type UserRole } from '@/lib/roles'

const NavItem = ({ href, children, testId }: { href: string; children: React.ReactNode; testId?: string }) => {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={[
        'px-3 py-2 rounded-md text-sm font-medium transition',
        active ? 'text-nordic-blue bg-silver-mist/50' : 'text-granite-grey hover:text-nordic-blue'
      ].join(' ')}
      data-testid={testId}
    >
      {children}
    </Link>
  )
}

export function NavBar() {
  const [session, setSession] = useState<any>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLoginDropdown, setShowLoginDropdown] = useState(false)
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false)
  const loginDropdownRef = useRef<HTMLDivElement>(null)
  const logoutDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase().auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
      if (data.session) {
        // Get user role
        supabase()
          .from('profiles')
          .select('role')
          .eq('id', data.session.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            setUserRole(profile?.role as UserRole || null)
          })
      }
    })
    
    const { data: sub } = supabase().auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s) {
        // Get user role
        supabase()
          .from('profiles')
          .select('role')
          .eq('id', s.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            setUserRole(profile?.role as UserRole || null)
          })
      } else {
        setUserRole(null)
      }
    })
    
    return () => sub?.subscription.unsubscribe()
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (loginDropdownRef.current && !loginDropdownRef.current.contains(event.target as Node)) {
        setShowLoginDropdown(false)
      }
      if (logoutDropdownRef.current && !logoutDropdownRef.current.contains(event.target as Node)) {
        setShowLogoutDropdown(false)
      }
    }

    if (showLoginDropdown || showLogoutDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLoginDropdown, showLogoutDropdown])

  return (
    <header className="bg-white border-b border-silver-mist/80">
      <nav className="container-blockbid h-14 flex items-center justify-between">
        {/* Left: logo */}
        <Link href="/" className="flex items-center gap-2" data-testid="nav-logo">
          <div className="w-6 h-6 rounded-md bg-nordic-blue text-white grid place-items-center font-poppins font-bold text-sm">B</div>
          <span className="text-lg font-poppins font-semibold text-granite-grey tracking-wide">BLOCKBID</span>
        </Link>

        {/* Center: navigation */}
        <nav className="hidden md:flex items-center gap-2" data-testid="nav-main">
          <NavItem href="/tenders" testId="nav-tenders">Udbud</NavItem>
          <NavItem href="/create" testId="nav-create">Opret</NavItem>
          <NavItem href="/documents">Dokumenter</NavItem>
          <NavItem href="/about">Om</NavItem>
          <NavItem href="/contact">Kontakt</NavItem>
        </nav>

        {/* Right: auth / dashboard */}
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="w-20 h-8" /> // Placeholder while loading
          ) : !session ? (
            <>
              {/* Login dropdown menu */}
              <div className="relative" ref={loginDropdownRef}>
                <button
                  onClick={() => setShowLoginDropdown(!showLoginDropdown)}
                  className="px-3 py-2 rounded-md text-sm font-medium text-granite-grey hover:text-nordic-blue flex items-center gap-1"
                  data-testid="nav-login"
                >
                  Log ind
                  <svg 
                    className={`w-4 h-4 transition-transform ${showLoginDropdown ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showLoginDropdown && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-silver-mist/80 rounded-md shadow-lg z-50">
                    <Link
                      href="/login?role=buyer"
                      onClick={() => setShowLoginDropdown(false)}
                      className="block px-4 py-2 text-sm text-granite-grey hover:bg-silver-mist/50 hover:text-nordic-blue first:rounded-t-md"
                    >
                      Ordregiver
                    </Link>
                    <Link
                      href="/login?role=supplier"
                      onClick={() => setShowLoginDropdown(false)}
                      className="block px-4 py-2 text-sm text-granite-grey hover:bg-silver-mist/50 hover:text-nordic-blue last:rounded-b-md"
                    >
                      Leverandør
                    </Link>
                  </div>
                )}
              </div>
              <Link href="/signup" className="btn-primary text-sm px-4 py-2 rounded-lg" data-testid="nav-register">Opret konto</Link>
            </>
          ) : (
            <>
              {userRole && (
                <Link 
                  href={userRole === 'buyer' ? '/buyer' : '/supplier'} 
                  className="px-3 py-2 rounded-md text-sm font-medium text-granite-grey hover:text-nordic-blue"
                  data-testid={userRole === 'buyer' ? 'nav-buyer' : 'nav-supplier'}
                >
                  Dashboard
                </Link>
              )}
              {/* Tiny avatar placeholder */}
              <div className="w-8 h-8 rounded-full bg-silver-mist" aria-hidden="true"></div>
              {/* Logout dropdown menu */}
              <div className="relative" ref={logoutDropdownRef}>
                <button
                  onClick={() => setShowLogoutDropdown(!showLogoutDropdown)}
                  className="px-3 py-2 rounded-md text-sm font-medium text-granite-grey hover:text-nordic-blue flex items-center gap-1"
                  data-testid="nav-logout"
                >
                  Log ind
                  <svg 
                    className={`w-4 h-4 transition-transform ${showLogoutDropdown ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showLogoutDropdown && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-silver-mist/80 rounded-md shadow-lg z-50">
                    <Link
                      href="/login?role=buyer"
                      onClick={() => setShowLogoutDropdown(false)}
                      className="block px-4 py-2 text-sm text-granite-grey hover:bg-silver-mist/50 hover:text-nordic-blue first:rounded-t-md"
                    >
                      Ordregiver
                    </Link>
                    <Link
                      href="/login?role=supplier"
                      onClick={() => setShowLogoutDropdown(false)}
                      className="block px-4 py-2 text-sm text-granite-grey hover:bg-silver-mist/50 hover:text-nordic-blue last:rounded-b-md"
                    >
                      Leverandør
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}