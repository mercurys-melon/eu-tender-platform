export const dynamic = 'force-dynamic'

import type { ReactNode } from 'react'
import { Wordmark } from '@/components/brand/wordmark'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      {/* Wordmark øverst – ingen sidebar, ingen navigation */}
      <div className="mb-8">
        <Wordmark size="lg" />
      </div>

      <main id="main" className="w-full max-w-md">
        {children}
      </main>
    </div>
  )
}
