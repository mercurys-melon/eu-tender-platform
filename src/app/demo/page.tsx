'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'

export default function DemoPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-xp-sky flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl font-space">Indlæser...</div>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen bg-xp-sky flex items-center justify-center p-4">
        <div className="bubble-card text-center max-w-md w-full animate-scale-in">
          <div className="accent-bar mb-6"></div>
          <h1 className="text-h1 mb-4 font-space text-digital-navy">
            Velkommen til BlockBid!
          </h1>
          <p className="text-pixel-grey mb-6 font-inter">
            Du er nu logget ind som <span className="font-semibold text-digital-navy">{user.email}</span>
          </p>
          <div className="space-y-3">
            <Link href="/tenders">
              <button className="btn-primary w-full">
                🔍 Se Aktive Udbud
              </button>
            </Link>
            <Link href="/create">
              <button className="btn-accent w-full">
                ⚒️ Opret Nyt Udbud
              </button>
            </Link>
            <Link href="/marketing">
              <button className="btn-outline w-full">
                🎯 Se Marketing
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-xp-sky relative overflow-hidden">
      {/* XP Sky Background Decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-xp-sky-blue via-blue-400 to-white opacity-90"></div>
      
      {/* Floating Geometric Elements (Posthog-inspired) */}
      <div className="absolute top-20 left-10 opacity-20 animate-float">
        <div className="w-16 h-16 bg-hint-green rounded-xp rotate-12"></div>
      </div>
      <div className="absolute top-40 right-20 opacity-20 animate-float" style={{ animationDelay: '0.5s' }}>
        <div className="w-20 h-20 bg-sunset-orange rounded-xp-lg -rotate-12"></div>
      </div>
      <div className="absolute bottom-40 left-1/4 opacity-15 animate-float" style={{ animationDelay: '1s' }}>
        <div className="w-24 h-24 bg-pastel-yellow rounded-xp"></div>
      </div>
      <div className="absolute bottom-20 right-1/3 opacity-20 animate-float" style={{ animationDelay: '1.5s' }}>
        <div className="w-12 h-12 bg-white rounded-xp-lg rotate-45"></div>
      </div>
      
      {/* Retro Tech Grid Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="h-full w-full" style={{
          backgroundImage: `
            linear-gradient(to right, #1E3A8A 1px, transparent 1px),
            linear-gradient(to bottom, #1E3A8A 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* Hero Section */}
      <section className="relative section-blockbid pt-20">
        <div className="container-blockbid">
          <div className="max-w-5xl mx-auto text-center">
            {/* Logo / Brand Mark */}
            <div className="inline-flex items-center justify-center mb-8 animate-slide-up">
              <div className="relative">
                <div className="w-20 h-20 bg-white rounded-xp-lg shadow-blockbid-xl flex items-center justify-center transform hover:scale-110 transition-transform duration-300">
                  <div className="w-14 h-14 bg-xp-sky-blue rounded-xp flex items-center justify-center">
                    <span className="text-white font-space font-bold text-2xl">B</span>
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-hint-green rounded-full border-2 border-white"></div>
                </div>
              </div>
            </div>

            <h1 className="text-5xl lg:text-7xl font-space font-bold mb-6 text-white drop-shadow-lg animate-fade-in-down">
              BlockBid
            </h1>
            <div className="accent-bar max-w-md mx-auto mb-8 animate-fade-in"></div>
            <h2 className="text-h2 mb-8 text-white drop-shadow-md animate-fade-in-up font-space">
              Udbud gjort enkelt
            </h2>
            <p className="text-lg mb-12 text-white/90 max-w-2xl mx-auto animate-fade-in font-inter leading-relaxed">
              Digitale løsninger til rigtige mennesker. BlockBid kombinerer moderne teknologi med brugervenlighed – 
              <span className="font-semibold"> transparens uden bureaukratiet.</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up mb-12">
              <Link href="/login">
                <button className="btn-primary px-8" aria-label="Log ind på din BlockBid konto">
                  🔑 Log Ind
                </button>
              </Link>
              <Link href="/register">
                <button className="btn-accent px-8" aria-label="Opret en ny BlockBid konto">
                  📝 Opret Konto
                </button>
              </Link>
              <Link href="/marketing">
                <button className="btn-outline border-white text-white hover:bg-white hover:text-xp-sky-blue px-8" aria-label="Se BlockBid marketing side">
                  🎯 Læs Mere
                </button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-6 text-white/80 text-sm font-inter animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-hint-green rounded-full"></div>
                <span>100% Transparent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-hint-green rounded-full"></div>
                <span>EU-Godkendt</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-hint-green rounded-full"></div>
                <span>Sikker Platform</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section with XP-style Cards */}
      <section className="section-blockbid relative">
        <div className="container-blockbid">
          <div className="text-center mb-16">
            <h2 className="text-h2 mb-4 text-digital-navy font-space">
              Funktioner der virker
            </h2>
            <p className="text-xl text-pixel-grey max-w-2xl mx-auto font-inter">
              Professionelt, men menneskeligt. Moderne, men nostalgisk.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bubble-card text-center group animate-slide-up">
              <div className="w-16 h-16 bg-gradient-to-br from-xp-sky-blue to-blue-500 rounded-xp mx-auto mb-4 flex items-center justify-center shadow-xp-soft group-hover:scale-110 transition-transform">
                <span className="text-3xl">⚒️</span>
              </div>
              <h3 className="text-h3 mb-4 font-space text-digital-navy">Opret Udbud</h3>
              <p className="text-pixel-grey font-inter">
                Intuitive formularer og professionel håndtering. Start på minutter, ikke timer.
              </p>
              <div className="h-1 w-12 bg-xp-sky-blue rounded-full mx-auto mt-4"></div>
            </div>

            <div className="bubble-card text-center group animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-16 h-16 bg-gradient-to-br from-hint-green to-green-500 rounded-xp mx-auto mb-4 flex items-center justify-center shadow-xp-soft group-hover:scale-110 transition-transform">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="text-h3 mb-4 font-space text-digital-navy">Find Muligheder</h3>
              <p className="text-pixel-grey font-inter">
                Avanceret søgning med smarte filtre. Gennemskuelighed i hver detalje.
              </p>
              <div className="h-1 w-12 bg-hint-green rounded-full mx-auto mt-4"></div>
            </div>

            <div className="bubble-card text-center group animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-16 h-16 bg-gradient-to-br from-sunset-orange to-orange-500 rounded-xp mx-auto mb-4 flex items-center justify-center shadow-xp-soft group-hover:scale-110 transition-transform">
                <span className="text-3xl">💼</span>
              </div>
              <h3 className="text-h3 mb-4 font-space text-digital-navy">Vind Kontrakter</h3>
              <p className="text-pixel-grey font-inter">
                Sikker budgivning og fair konkurrence. Digital effektivitet møder tillid.
              </p>
              <div className="h-1 w-12 bg-sunset-orange rounded-full mx-auto mt-4"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section with XP Window Style */}
      <section className="section-blockbid bg-white/60 backdrop-blur-md relative">
        <div className="container-blockbid">
          <div className="card-xp p-12 max-w-5xl mx-auto">
            {/* XP-style window header */}
            <div className="flex items-center gap-2 mb-8 pb-4 border-b border-pixel-grey/20">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-sunset-orange"></div>
                <div className="w-3 h-3 rounded-full bg-pastel-yellow"></div>
                <div className="w-3 h-3 rounded-full bg-hint-green"></div>
              </div>
              <div className="text-sm font-mono text-pixel-grey ml-2">blockbid://stats</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="animate-fade-in-up">
                <div className="text-5xl font-space font-bold text-xp-sky-blue mb-2">100+</div>
                <div className="text-pixel-grey font-inter">Aktive Udbud</div>
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <div className="text-5xl font-space font-bold text-hint-green mb-2">50+</div>
                <div className="text-pixel-grey font-inter">Tilfredse Kunder</div>
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <div className="text-5xl font-space font-bold text-sunset-orange mb-2">24/7</div>
                <div className="text-pixel-grey font-inter">Support</div>
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <div className="text-5xl font-space font-bold text-digital-navy mb-2">99%</div>
                <div className="text-pixel-grey font-inter">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Posthog-inspired graphic section */}
      <section className="section-blockbid relative">
        <div className="container-blockbid">
          <div className="text-center mb-16">
            <h2 className="text-h2 mb-4 text-digital-navy font-space">
              Sådan fungerer det
            </h2>
            <p className="text-xl text-pixel-grey font-inter">
              Tre simple trin til succes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="relative">
              <div className="bubble-card text-center">
                <div className="w-12 h-12 bg-xp-sky-blue text-white rounded-full flex items-center justify-center mx-auto mb-4 font-space font-bold text-xl shadow-xp-button">
                  1
                </div>
                <h3 className="text-h3 mb-3 font-space text-digital-navy">Tilmeld dig</h3>
                <p className="text-pixel-grey font-inter">
                  Opret din konto på under 2 minutter
                </p>
              </div>
              {/* Connection line */}
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-xp-sky-blue to-hint-green"></div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="bubble-card text-center">
                <div className="w-12 h-12 bg-hint-green text-white rounded-full flex items-center justify-center mx-auto mb-4 font-space font-bold text-xl shadow-xp-button">
                  2
                </div>
                <h3 className="text-h3 mb-3 font-space text-digital-navy">Søg eller Opret</h3>
                <p className="text-pixel-grey font-inter">
                  Find udbud eller opret dit eget
                </p>
              </div>
              {/* Connection line */}
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-hint-green to-sunset-orange"></div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="bubble-card text-center">
                <div className="w-12 h-12 bg-sunset-orange text-white rounded-full flex items-center justify-center mx-auto mb-4 font-space font-bold text-xl shadow-xp-button">
                  3
                </div>
                <h3 className="text-h3 mb-3 font-space text-digital-navy">Luk Aftalen</h3>
                <p className="text-pixel-grey font-inter">
                  Gennemsigtig proces, sikker håndtering
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-blockbid pb-32">
        <div className="container-blockbid text-center">
          <div className="card-xp max-w-3xl mx-auto p-12 animate-scale-in relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-xp-sky-blue/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-sunset-orange/10 rounded-full blur-2xl"></div>
            
            <div className="relative">
              <div className="accent-bar mb-8 max-w-md mx-auto"></div>
              <h2 className="text-h2 mb-6 font-space text-digital-navy">
                Klar til at komme i gang?
              </h2>
              <p className="text-pixel-grey mb-8 font-inter text-lg max-w-xl mx-auto">
                Slut dig til hundredvis af virksomheder der allerede bruger BlockBid. 
                <span className="block mt-2 font-semibold text-digital-navy">
                  Gennemsigtighed. Tillid. Enkelhed. Optimisme.
                </span>
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <button className="btn-accent px-8">
                    🚀 Kom i Gang Gratis
                  </button>
                </Link>
                <Link href="/tenders">
                  <button className="btn-outline px-8">
                    🔍 Se Aktive Udbud
                  </button>
                </Link>
              </div>
              
              {/* Trust badge */}
              <div className="mt-8 pt-6 border-t border-pixel-grey/20">
                <p className="text-sm text-pixel-grey font-inter">
                  ✓ Ingen kreditkort påkrævet &nbsp;•&nbsp; ✓ Gratis at komme i gang &nbsp;•&nbsp; ✓ Opsig når som helst
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
