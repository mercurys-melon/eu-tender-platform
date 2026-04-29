import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { getUser, getProfile } from '@/lib/auth'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [user, profile] = await Promise.all([getUser(), getProfile()])

  if (!user || !profile) redirect('/login')

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar
        activeRole={profile.active_role}
        fullName={profile.full_name}
        email={user.email}
      />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar
          activeRole={profile.active_role}
          fullName={profile.full_name}
          email={user.email}
        />
        <main id="main" className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
