import type { ReactNode } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Desktop sidebar – fast w-64 via fixed positioning */}
      <Sidebar />

      {/* Indhold: skubbet til højre for sidebar på lg+ */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar />
        <main id="main" className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
