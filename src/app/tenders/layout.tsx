import { ReactNode } from 'react'
import { NavBar } from '@/components/layout/nav-bar'
import { SiteFooter } from '@/components/layout/site-footer'

export default function TendersLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <NavBar />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  )
} 