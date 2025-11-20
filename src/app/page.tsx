import Link from 'next/link'
import { getRoleDisplayName, getRoleDescription } from '@/lib/roles'

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-nordic-blue text-white">
        <div className="container-blockbid section-blockbid grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <h1 className="text-h1 text-white">Effektive digitale udbudsløsninger</h1>
            <p className="text-lg text-silver-mist">
              Gennemsigtige og enkle for alle parter. BlockBid gør det nemt at deltage i og administrere offentlige udbud.
            </p>
          </div>
          <div className="hidden lg:block">
            <div className="w-full h-56 rounded-xl bg-white/5 border border-white/10" />
          </div>
        </div>
      </section>

      {/* Role Selection */}
      <section className="bg-white">
        <div className="container-blockbid section-tight grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Leverandør */}
          <div className="card p-6 flex flex-col gap-3">
            <h3 className="text-h3">Jeg er leverandør</h3>
            <p className="text-granite-grey">{getRoleDescription('supplier')}</p>
            <div className="flex gap-3 mt-2">
              <Link href="/login?role=supplier" className="btn-primary">Log ind som leverandør</Link>
              <Link href="/register?role=supplier" className="btn-outline">Opret konto</Link>
            </div>
          </div>
          {/* Ordregiver */}
          <div className="card p-6 flex flex-col gap-3">
            <h3 className="text-h3">Jeg er ordregiver</h3>
            <p className="text-granite-grey">{getRoleDescription('buyer')}</p>
            <div className="flex gap-3 mt-2">
              <Link href="/login?role=buyer" className="btn-primary">Log ind som ordregiver</Link>
              <Link href="/register?role=buyer" className="btn-outline">Opret konto</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features – SMÅ ikoner */}
      <section className="bg-white">
        <div className="container-blockbid section-tight grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Gennemsigtighed', text: 'Dokumenter og kommunikation i realtid for alle parter.' },
            { title: 'Hurtig publicering', text: 'Opret og del udbud på få minutter.' },
            { title: 'Sikkerhed', text: 'Robust adgangsstyring og revisionsspor.' },
          ].map((f, i) => (
            <div key={i} className="card p-6">
              <div className="icon-ring bg-emerald-green/10 mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-emerald-green">
                  <path d="M9 12.75L11.25 15 15 9.75" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-h3 mb-1">{f.title}</h3>
              <p className="text-granite-grey">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Udbudsscanner */}
      <section className="bg-white">
        <div className="container-blockbid section-blockbid">
          <div className="card p-6 text-center">
            <h2 className="text-h2 mb-4">Udbudsscanner</h2>
            <p className="text-granite-grey mb-6">Få adgang til avanceret udbudssøgning – log ind som leverandør</p>
            <Link href="/login?role=supplier" className="btn-primary">Gå til log ind</Link>
          </div>
        </div>
      </section>
    </>
  )
}
