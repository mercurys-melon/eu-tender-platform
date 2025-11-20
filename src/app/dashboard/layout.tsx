import { ReactNode } from 'react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-silver-mist/30">
      <main id="main" className="container-blockbid py-8">{children}</main>
    </div>
  )
}
