import type { Metadata } from 'next'
import './globals.css'
import { NavBar } from '@/components/layout/nav-bar'
import { Poppins, Inter, Space_Grotesk } from 'next/font/google'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400','500','600','700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400','500','600','700'],
  variable: '--font-poppins',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400','500','600'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'BlockBid - Effektive digitale udbudsløsninger',
  description: 'Effektive digitale udbudsløsninger – gennemsigtige og enkle for alle parter',
  keywords: 'udbud, budgivning, blockbid, danmark, eu-tender, digitale løsninger',
  authors: [{ name: 'BlockBid' }],
  creator: 'BlockBid',
  publisher: 'BlockBid',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'BlockBid - Effektive digitale udbudsløsninger',
    description: 'Effektive digitale udbudsløsninger – gennemsigtige og enkle for alle parter',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    siteName: 'BlockBid',
    locale: 'da_DK',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BlockBid - Effektive digitale udbudsløsninger',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BlockBid - Effektive digitale udbudsløsninger',
    description: 'Effektive digitale udbudsløsninger – gennemsigtige og enkle for alle parter',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_VERIFICATION_CODE,
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="da" className={`${spaceGrotesk.variable} ${poppins.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3B82F6" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />

      </head>
      <body className="antialiased">
        <div className="min-h-screen bg-arctic-white flex flex-col">
          {/* Skip to content link for accessibility */}
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white text-black px-3 py-2 rounded">
            Spring til indhold
          </a>
          <NavBar />
          <main id="main" className="flex-1">
            {children}
          </main>
          <footer className="bg-nordic-blue text-white border-t border-nordic-blue/20">
            <div className="container-blockbid py-12">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center space-x-3 mb-4">
                                  <div className="w-8 h-8 bg-emerald-green rounded-xl flex items-center justify-center relative">
                <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center">
                        <span className="text-emerald-green font-poppins font-bold text-sm">B</span>
                      </div>
                      <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-emerald-green rounded-sm"></div>
                    </div>
                    <span className="text-white font-poppins font-semibold text-lg tracking-wide">BLOCKBID</span>
                  </div>
                  <p className="text-silver-mist mb-4">
                    Effektive digitale udbudsløsninger – gennemsigtige og enkle for alle parter
                  </p>
                  <div className="flex space-x-4">
                    <a href="#" className="text-silver-mist hover:text-white transition-colors">
                      <span className="sr-only">LinkedIn</span>
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                    <a href="#" className="text-silver-mist hover:text-white transition-colors">
                      <span className="sr-only">Twitter</span>
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                      </svg>
                    </a>
                  </div>
                </div>
                <div>
                  <h4 className="text-h4 mb-4">Produkter</h4>
                  <ul className="space-y-2">
                    <li><a href="/tenders" className="text-silver-mist hover:text-white transition-colors">Udbud</a></li>
                    <li><a href="/documents" className="text-silver-mist hover:text-white transition-colors">Dokumenter</a></li>
                    <li><a href="/qa" className="text-silver-mist hover:text-white transition-colors">Spørgsmål & Svar</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-h4 mb-4">Support</h4>
                  <ul className="space-y-2">
                    <li><a href="/contact" className="text-silver-mist hover:text-white transition-colors">Kontakt</a></li>
                    <li><a href="/about" className="text-silver-mist hover:text-white transition-colors">Om BlockBid</a></li>
                    <li><a href="/help" className="text-silver-mist hover:text-white transition-colors">Hjælp</a></li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-nordic-blue/20 mt-8 pt-8 text-center">
                <p className="text-silver-mist text-small">
                  © 2024 BlockBid. Alle rettigheder forbeholdes.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
} 