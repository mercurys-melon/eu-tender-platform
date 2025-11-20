'use client'

import Link from 'next/link'

export default function SupplierHome() {
  return (
    <>
      <h1 className="text-h2 mb-4">Mit BlockBid (Leverandør)</h1>
      <div className="flex gap-2 mb-6">
        <Link className="btn-outline" href="/supplier/soeg">Søg udbud</Link>
        <Link className="btn-outline" href="/supplier/aktive">Aktive udbud</Link>
        <Link className="btn-outline" href="/supplier/afsluttede">Afsluttede udbud</Link>
        <Link className="btn-outline" href="/supplier/udbudsscanner">Udbudsscanner</Link>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-h4 mb-3">Favoritter ⭐</h3>
          <div className="space-y-2">
            <Link href="/tenders?search=IT-udstyr" className="block p-2 rounded hover:bg-nordic-blue/10 hover:text-nordic-blue transition-colors cursor-pointer">
              <div className="text-sm text-granite-grey hover:text-nordic-blue">IT-udstyr til kommunen</div>
            </Link>
            <Link href="/tenders?search=rengøring" className="block p-2 rounded hover:bg-nordic-blue/10 hover:text-nordic-blue transition-colors cursor-pointer">
              <div className="text-sm text-granite-grey hover:text-nordic-blue">Rengøring af skoler</div>
            </Link>
            <Link href="/tenders?search=gartnertjenester" className="block p-2 rounded hover:bg-nordic-blue/10 hover:text-nordic-blue transition-colors cursor-pointer">
              <div className="text-sm text-granite-grey hover:text-nordic-blue">Gartnertjenester</div>
            </Link>
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-h4 mb-3">Aktivitet</h3>
          <div className="space-y-2">
            <Link href="/tenders" className="block p-2 rounded hover:bg-emerald-green/10 hover:text-emerald-green transition-colors cursor-pointer">
              <div className="text-sm text-granite-grey hover:text-emerald-green">Seneste spørgsmål besvaret</div>
            </Link>
            <Link href="/tenders" className="block p-2 rounded hover:bg-emerald-green/10 hover:text-emerald-green transition-colors cursor-pointer">
              <div className="text-sm text-granite-grey hover:text-emerald-green">Nyt udbud fundet</div>
            </Link>
            <Link href="/supplier/aktive" className="block p-2 rounded hover:bg-deep-orange/10 hover:text-deep-orange transition-colors cursor-pointer">
              <div className="text-sm text-granite-grey hover:text-deep-orange">Deadline i morgen</div>
            </Link>
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-h4 mb-3">Notifikationer</h3>
          <div className="space-y-2">
            <Link href="/tenders" className="block p-2 rounded hover:bg-nordic-blue/10 hover:text-nordic-blue transition-colors cursor-pointer">
              <div className="text-sm text-granite-grey hover:text-nordic-blue">3 nye udbud</div>
            </Link>
            <Link href="/tenders" className="block p-2 rounded hover:bg-nordic-blue/10 hover:text-nordic-blue transition-colors cursor-pointer">
              <div className="text-sm text-granite-grey hover:text-nordic-blue">1 svar på spørgsmål</div>
            </Link>
            <Link href="/supplier/aktive" className="block p-2 rounded hover:bg-deep-orange/10 hover:text-deep-orange transition-colors cursor-pointer">
              <div className="text-sm text-granite-grey hover:text-deep-orange">Deadline påmindelse</div>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
