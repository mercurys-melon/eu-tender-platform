import type { Metadata } from 'next'
import './globals.css'
import { Poppins, Inter, Space_Grotesk } from 'next/font/google'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Mercurry Tender – Effektive digitale udbudsløsninger',
  description: 'Effektive digitale udbudsløsninger – gennemsigtige og enkle for alle parter',
  keywords: 'udbud, budgivning, mercurry tender, danmark, eu-tender, digitale løsninger',
  authors: [{ name: 'Mercurry Tender' }],
  creator: 'Mercurry Tender',
  publisher: 'Mercurry Tender',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Mercurry Tender – Effektive digitale udbudsløsninger',
    description: 'Effektive digitale udbudsløsninger – gennemsigtige og enkle for alle parter',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    siteName: 'Mercurry Tender',
    locale: 'da_DK',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mercurry Tender – Effektive digitale udbudsløsninger',
    description: 'Effektive digitale udbudsløsninger – gennemsigtige og enkle for alle parter',
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
    <html
      lang="da"
      className={`${spaceGrotesk.variable} ${poppins.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1F437A" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
      </head>
      <body className="antialiased bg-background text-foreground">
        {/* Skip-to-content link for tilgængelighed */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white text-black px-3 py-2 rounded"
        >
          Spring til indhold
        </a>
        {children}
      </body>
    </html>
  )
}
