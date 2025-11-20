'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const Tab = ({ href, children }: { href: string; children: React.ReactNode }) => {
  const pathname = usePathname()
  const active = pathname === href
  return (
    <Link
      href={href}
      className={[
        'px-4 py-2 rounded-lg text-sm font-medium',
        active ? 'bg-white shadow-blockbid text-nordic-blue' : 'text-granite-grey hover:text-nordic-blue'
      ].join(' ')}
    >
      {children}
    </Link>
  )
}

export default function DashboardPage() {
  return (
    <>
      <h1 className="text-h2 mb-4">Mit BlockBid</h1>
      <div className="flex gap-2 mb-6">
        <Tab href="/dashboard">Oversigt</Tab>
        <Tab href="/dashboard/mine-udbud">Mine udbud</Tab>
        <Tab href="/dashboard/soeg">Søg udbud</Tab>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="card p-6"><h3 className="text-h3 mb-1">Hurtige genveje</h3><p>Opret udbud, importér dokumenter…</p></div>
        <div className="card p-6"><h3 className="text-h3 mb-1">Aktivitet</h3><p>Seneste spørgsmål, svar og uploads.</p></div>
        <div className="card p-6"><h3 className="text-h3 mb-1">Notifikationer</h3><p>Det vigtige i dag.</p></div>
      </div>
    </>
  )
}
