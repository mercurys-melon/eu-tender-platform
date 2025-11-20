import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-silver-mist/30">
      <main id="main" className="container-blockbid py-12 grid place-items-center">
        {children}
      </main>
    </div>
  )
}
