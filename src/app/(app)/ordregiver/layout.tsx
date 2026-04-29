import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'

export default async function OrdregiverLayout({ children }: { children: ReactNode }) {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.active_role !== 'buyer') redirect('/tilbudsgiver')
  return <>{children}</>
}
