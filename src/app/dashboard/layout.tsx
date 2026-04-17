import { ReactNode } from 'react'
import { NavBar } from '@/components/layout/nav-bar'
import { SiteFooter } from '@/components/layout/site-footer'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-silver-mist/30 flex flex-col">
      <NavBar />
      <main id="main" className="container-blockbid py-8 flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
