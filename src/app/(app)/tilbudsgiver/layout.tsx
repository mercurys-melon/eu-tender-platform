import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'

export default async function TilbudsgiverLayout({ children }: { children: ReactNode }) {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.active_role !== 'supplier') redirect('/ordregiver')
  return <>{children}</>
}
