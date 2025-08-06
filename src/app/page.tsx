import Link from 'next/link'
import { Search, FileText, Users, Shield, Globe, Award } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              EU Tender Platform
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Komplet løsning til EU-udbud for offentlige enheder i Danmark
            </p>
            <p className="text-lg mb-12 text-blue-200 max-w-3xl mx-auto">
              Vores platform giver dig alle værktøjer til at håndtere EU-udbud effektivt og kompliant. 
              Kompatibel med ESPD og TED (Tenders Electronic Daily).
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/tenders"
                className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Se Aktive Udbud
              </Link>
              <Link 
                href="/register"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
              >
                Registrer Dig
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Funktioner der gør forskellen
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Alt du skal bruge til at håndtere EU-udbud professionelt og kompliant
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">ESPD Integration</h3>
              <p className="text-gray-600">
                Automatisk generering og validering af European Single Procurement Document
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <Globe className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">TED Kompatibilitet</h3>
              <p className="text-gray-600">
                Direkte integration med Tenders Electronic Daily for automatisk publicering
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Leverandør Portal</h3>
              <p className="text-gray-600">
                Komplet portal til leverandører med registrering og kvalifikationsstyring
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-6">
                <Search className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Avanceret Søgning</h3>
              <p className="text-gray-600">
                Find udbud hurtigt med filtrering på kategori, værdi og lokation
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Sikker Dokumentstyring</h3>
              <p className="text-gray-600">
                Sikker upload og versionering af alle udbudsrelaterede dokumenter
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-6">
                <Award className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Kvalifikationsstyring</h3>
              <p className="text-gray-600">
                Automatisk vurdering af leverandørkvalifikationer og compliance
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-blue-200">Aktive Udbud</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">1000+</div>
              <div className="text-blue-200">Registrerede Leverandører</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-blue-200">Offentlige Enheder</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">99.9%</div>
              <div className="text-blue-200">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Kom i gang i dag
          </h2>
          <p className="text-xl mb-8 text-gray-300 max-w-2xl mx-auto">
            Tilslut dig hundredvis af offentlige enheder og leverandører der allerede bruger vores platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/register"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Opret Gratis Konto
            </Link>
            <Link 
              href="/contact"
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-gray-900 transition-colors"
            >
              Kontakt Os
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">EU Tender Platform</h3>
              <p className="text-gray-400">
                Den komplette løsning til EU-udbud i Danmark
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produkt</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/features" className="hover:text-white">Funktioner</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Priser</Link></li>
                <li><Link href="/api" className="hover:text-white">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help" className="hover:text-white">Hjælp</Link></li>
                <li><Link href="/contact" className="hover:text-white">Kontakt</Link></li>
                <li><Link href="/status" className="hover:text-white">Status</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Juridisk</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/privacy" className="hover:text-white">Privatlivspolitik</Link></li>
                <li><Link href="/terms" className="hover:text-white">Vilkår</Link></li>
                <li><Link href="/cookies" className="hover:text-white">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 EU Tender Platform. Alle rettigheder forbeholdes.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 