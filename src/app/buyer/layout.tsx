import { NavBar } from '@/components/layout/nav-bar'
import { SiteFooter } from '@/components/layout/site-footer'

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-xp-sky-blue/5 flex flex-col">
      <NavBar />
      <main className="container-blockbid py-8 flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
