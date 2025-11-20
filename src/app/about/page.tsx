import { Breadcrumb } from '@/components/ui/breadcrumb'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-arctic-white">
      {/* Breadcrumb */}
      <div className="bg-silver-mist/30 border-b border-silver-mist">
        <div className="container-blockbid py-4">
          <Breadcrumb 
            items={[
              { label: 'Forside', href: '/' },
              { label: 'Om BlockBid', href: '/about' }
            ]} 
          />
        </div>
      </div>

      {/* Hero Section */}
      <section className="section-blockbid">
        <div className="container-blockbid">
          <div className="text-center mb-16">
            <h1 className="text-h1 mb-6">Om BlockBid</h1>
            <p className="text-granite-grey text-lg max-w-3xl mx-auto">
              Vi er dedikerede til at revolutionere den måde, offentlige udbud håndteres på i Danmark. 
              Vores mission er at skabe gennemsigtighed, effektivitet og tillid i udbudsprocessen.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="section-blockbid bg-silver-mist/30">
        <div className="container-blockbid">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-h2 mb-6">Vores mission</h2>
              <p className="text-granite-grey text-lg mb-6">
                BlockBid blev grundlagt med en klar vision: at gøre offentlige udbud mere tilgængelige, 
                gennemsigtige og effektive for alle parter. Vi tror på, at digitalisering kan skabe 
                bedre resultater for både offentlige myndigheder og private virksomheder.
              </p>
              <p className="text-granite-grey text-lg">
                Vores platform understøtter hele udbudsprocessen fra opslag til afgørelse, 
                med fokus på compliance, sikkerhed og brugervenlighed.
              </p>
            </div>
                         <div className="bg-white rounded-xl p-8 shadow-blockbid">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-emerald-green/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-emerald-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-h4 mb-2">Gennemsigtighed</h3>
                    <p className="text-slate-grey">Alle dokumenter og kommunikation er tilgængelige for alle parter i realtid.</p>
                  </div>
                </div>
                                 <div className="flex items-start space-x-4">
                   <div className="w-12 h-12 bg-emerald-green/10 rounded-xl flex items-center justify-center flex-shrink-0">
                     <svg className="w-6 h-6 text-emerald-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                     </svg>
                   </div>
                   <div>
                     <h3 className="text-h4 mb-2">Effektivitet</h3>
                     <p className="text-slate-grey">Digitaliseret proces der sparer tid og reducerer administrative omkostninger.</p>
                   </div>
                 </div>
                 <div className="flex items-start space-x-4">
                   <div className="w-12 h-12 bg-emerald-green/10 rounded-xl flex items-center justify-center flex-shrink-0">
                     <svg className="w-6 h-6 text-emerald-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                     </svg>
                   </div>
                   <div>
                     <h3 className="text-h4 mb-2">Sikkerhed</h3>
                     <p className="text-slate-grey">Højeste sikkerhedsstandarder og compliance med dansk og EU lovgivning.</p>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-blockbid">
        <div className="container-blockbid">
          <div className="text-center mb-16">
            <h2 className="text-h2 mb-4">Vores værdier</h2>
            <p className="text-slate-grey text-lg max-w-3xl mx-auto">
              Disse værdier driver alt, hvad vi gør, og former vores tilgang til at levere 
              den bedste udbudsplatform i Danmark.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-h3 mb-3">Tillid</h3>
              <p className="text-slate-grey">
                Vi bygger tillid gennem gennemsigtighed, ærlighed og pålidelighed i alt, hvad vi gør.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-deep-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-deep-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-h3 mb-3">Innovation</h3>
              <p className="text-slate-grey">
                Vi stræber konstant efter at forbedre vores platform og skabe bedre løsninger.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-nordic-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-nordic-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-h3 mb-3">Samarbejde</h3>
              <p className="text-slate-grey">
                Vi tror på styrken af samarbejde og bygger bro mellem offentlige og private aktører.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section-blockbid bg-silver-mist/30">
        <div className="container-blockbid">
          <div className="text-center mb-16">
            <h2 className="text-h2 mb-4">Vores team</h2>
            <p className="text-slate-grey text-lg max-w-3xl mx-auto">
              BlockBid er drevet af et dedikeret team af eksperter inden for udbud, 
              teknologi og offentlig forvaltning.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 text-center shadow-blockbid">
              <div className="w-20 h-20 bg-emerald-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-poppins font-semibold text-emerald-green">JD</span>
              </div>
              <h3 className="text-h4 mb-2">Jens Dahl</h3>
              <p className="text-slate-grey mb-3">CEO & Grundlægger</p>
              <p className="text-slate-grey text-small">
                15 års erfaring i offentlig forvaltning og digitalisering.
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 text-center shadow-blockbid">
              <div className="w-20 h-20 bg-deep-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-poppins font-semibold text-deep-orange">MH</span>
              </div>
              <h3 className="text-h4 mb-2">Maria Hansen</h3>
              <p className="text-slate-grey mb-3">CTO</p>
              <p className="text-slate-grey text-small">
                Ekspert i sikker softwareudvikling og cloud-arkitektur.
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 text-center shadow-blockbid">
              <div className="w-20 h-20 bg-nordic-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-poppins font-semibold text-nordic-blue">PL</span>
              </div>
              <h3 className="text-h4 mb-2">Peter Larsen</h3>
              <p className="text-slate-grey mb-3">Head of Legal</p>
              <p className="text-slate-grey text-small">
                Specialiseret i offentlig kontraktret og EU-udbudsregler.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="section-blockbid">
        <div className="container-blockbid">
          <div className="bg-nordic-blue rounded-2xl p-8 md:p-12 text-center text-white">
            <h2 className="text-h2 text-white mb-4">Har du spørgsmål?</h2>
            <p className="text-silver-mist text-lg mb-8 max-w-2xl mx-auto">
              Vores team er klar til at hjælpe dig med at komme i gang med BlockBid. 
              Kontakt os for en uforpligtende snak.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/contact" className="btn-primary">
                Kontakt os
              </a>
              <a href="/tenders" className="btn-outline border-white text-white hover:bg-white hover:text-nordic-blue">
                Se udbud
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
