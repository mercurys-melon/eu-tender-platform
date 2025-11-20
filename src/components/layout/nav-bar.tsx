'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { type UserRole } from '@/lib/roles'

const NavItem = ({ href, children }: { href: string; children: React.ReactNode }) => {
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
    >
      {children}
    </Link>
  )
}

export function NavBar() {
  const [session, setSession] = useState<any>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) {
        // Get user role
        supabase
          .from('profiles')
          .select('role')
          .eq('id', data.session.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            setUserRole(profile?.role as UserRole || null)
          })
      }
    })
    
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s) {
        // Get user role
        supabase
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

  return (
    <header className="bg-white border-b border-silver-mist/80">
      <nav className="container-blockbid h-14 flex items-center justify-between">
        {/* Left: logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-nordic-blue text-white grid place-items-center font-poppins font-bold text-sm">B</div>
          <span className="text-lg font-poppins font-semibold text-granite-grey tracking-wide">BLOCKBID</span>
        </Link>

        {/* Center: navigation */}
        <div className="hidden md:flex items-center gap-2">
          <NavItem href="/tenders">Udbud</NavItem>
          <NavItem href="/documents">Dokumenter</NavItem>
          <NavItem href="/about">Om</NavItem>
          <NavItem href="/contact">Kontakt</NavItem>
        </div>

        {/* Right: auth / dashboard */}
        <div className="flex items-center gap-2">
          {!session ? (
            <>
              <Link href="/login" className="px-3 py-2 rounded-md text-sm font-medium text-granite-grey hover:text-nordic-blue">
                Log ind
              </Link>
              <Link href="/register" className="btn-primary text-sm px-4 py-2 rounded-lg">Opret konto</Link>
            </>
          ) : (
            <>
              <Link 
                href={userRole === 'buyer' ? '/buyer' : '/supplier'} 
                className="px-3 py-2 rounded-md text-sm font-medium text-granite-grey hover:text-nordic-blue"
              >
                Dashboard
              </Link>
              {/* Tiny avatar placeholder */}
              <div className="w-8 h-8 rounded-full bg-silver-mist" aria-hidden />
            </>
          )}
        </div>
      </nav>
    </header>
  )
}