/* eslint-disable react/no-unescaped-entities */
import { Breadcrumb } from '@/components/ui/breadcrumb'

export default function QAPage() {
  return (
    <div className="min-h-screen bg-arctic-white">
      {/* Breadcrumb */}
      <div className="bg-silver-mist/30 border-b border-silver-mist">
        <div className="container-blockbid py-4">
          <Breadcrumb 
            items={[
              { label: 'Forside', href: '/' },
              { label: 'SpÃ¸rgsmÃ¥l & Svar', href: '/qa' }
            ]} 
          />
        </div>
      </div>

      {/* Header */}
      <section className="section-blockbid">
        <div className="container-blockbid">
          <div className="text-center mb-16">
            <h1 className="text-h1 mb-4">SpÃ¸rgsmÃ¥l & Svar</h1>
            <p className="text-slate-grey text-lg max-w-3xl mx-auto">
              Find svar pÃ¥ almindelige spÃ¸rgsmÃ¥l om BlockBid platformen og udbudsprocessen. 
              Her kan du ogsÃ¥ stille nye spÃ¸rgsmÃ¥l og se svar fra andre brugere.
            </p>
          </div>
        </div>
      </section>

      {/* Q&A Content */}
      <section className="section-blockbid">
        <div className="container-blockbid">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-silver-mist p-8 shadow-blockbid mb-8">
                <h2 className="text-h2 mb-6">Ofte stillede spÃ¸rgsmÃ¥l</h2>
                
                <div className="space-y-6">
                  <div className="border-b border-silver-mist pb-6">
                    <h3 className="text-h4 mb-3">Hvordan opretter jeg en konto pÃ¥ BlockBid?</h3>
                    <p className="text-slate-grey">
                      Du kan oprette en konto ved at klikke pÃ¥ "Opret konto" i toppen af siden. 
                      Du skal udfylde dine grundlÃ¦ggende oplysninger og bekrÃ¦fte din email-adresse.
                    </p>
                  </div>

                  <div className="border-b border-silver-mist pb-6">
                    <h3 className="text-h4 mb-3">Hvad koster det at bruge BlockBid?</h3>
                    <p className="text-slate-grey">
                      BlockBid tilbyder forskellige prispakker afhÃ¦ngigt af dine behov. 
                      GrundlÃ¦ggende funktioner er gratis, mens avancerede funktioner krÃ¦ver et abonnement.
                    </p>
                  </div>

                  <div className="border-b border-silver-mist pb-6">
                    <h3 className="text-h4 mb-3">Er BlockBid sikker at bruge?</h3>
                    <p className="text-slate-grey">
                      Ja, BlockBid fÃ¸lger de hÃ¸jeste sikkerhedsstandarder og er compliant med 
                      dansk og EU lovgivning om databeskyttelse og offentlige udbud.
                    </p>
                  </div>

                  <div className="border-b border-silver-mist pb-6">
                    <h3 className="text-h4 mb-3">Kan jeg se alle udbud pÃ¥ platformen?</h3>
                    <p className="text-slate-grey">
                      Ja, alle offentlige udbud er tilgÃ¦ngelige for alle brugere. 
                      Du kan sÃ¸ge og filtrere efter dine interesser og kompetencer.
                    </p>
                  </div>

                  <div className="border-b border-silver-mist pb-6">
                    <h3 className="text-h4 mb-3">Hvordan fungerer budgivningen?</h3>
                    <p className="text-slate-grey">
                      Budgivningen sker digitalt gennem vores sikre platform. 
                      Du uploader dine dokumenter og bud, som bliver behandlet automatisk.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-h4 mb-3">Hvad hvis jeg har tekniske problemer?</h3>
                    <p className="text-slate-grey">
                      Vores support-team er klar til at hjÃ¦lpe dig. Du kan kontakte os via 
                      kontaktformularen eller ringe til vores support-hotline.
                    </p>
                  </div>
                </div>
              </div>

              {/* Ask Question Section */}
              <div className="bg-white rounded-lg border border-silver-mist p-8 shadow-blockbid">
                <h2 className="text-h2 mb-6">Stil et spÃ¸rgsmÃ¥l</h2>
                <p className="text-slate-grey mb-6">
                  Har du ikke fundet svar pÃ¥ dit spÃ¸rgsmÃ¥l? Stil det her, og vores team 
                  eller andre brugere vil hjÃ¦lpe dig.
                </p>
                <a href="/contact" className="btn-primary">
                  Stil et spÃ¸rgsmÃ¥l
                </a>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Search */}
              <div className="bg-white rounded-lg border border-silver-mist p-6 shadow-blockbid">
                <h3 className="text-h4 mb-4">SÃ¸g i FAQ</h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="SÃ¸g efter spÃ¸rgsmÃ¥l..."
                    className="input pl-10"
                  />
                  <svg className="w-5 h-5 text-slate-grey absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Categories */}
              <div className="bg-white rounded-lg border border-silver-mist p-6 shadow-blockbid">
                <h3 className="text-h4 mb-4">Kategorier</h3>
                <div className="space-y-2">
                  <a href="#" className="block text-slate-grey hover:text-nordic-blue transition-colors">
                    Konto og registrering
                  </a>
                  <a href="#" className="block text-slate-grey hover:text-nordic-blue transition-colors">
                    Udbud og budgivning
                  </a>
                  <a href="#" className="block text-slate-grey hover:text-nordic-blue transition-colors">
                    Tekniske spÃ¸rgsmÃ¥l
                  </a>
                  <a href="#" className="block text-slate-grey hover:text-nordic-blue transition-colors">
                    Priser og fakturering
                  </a>
                  <a href="#" className="block text-slate-grey hover:text-nordic-blue transition-colors">
                    Sikkerhed og compliance
                  </a>
                </div>
              </div>

              {/* Contact Support */}
              <div className="bg-nordic-blue rounded-lg p-6 text-white">
                <h3 className="text-h4 mb-3">Brug for hjÃ¦lp?</h3>
                <p className="text-silver-mist mb-4">
                  Vores support-team er klar til at hjÃ¦lpe dig med alle spÃ¸rgsmÃ¥l.
                </p>
                <a href="/contact" className="btn-outline border-white text-white hover:bg-white hover:text-nordic-blue">
                  Kontakt support
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
