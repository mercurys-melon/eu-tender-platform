import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EU Tender Platform - Danmark',
  description: 'Komplet platform til EU-udbud for offentlige enheder i Danmark. Kompatibel med ESPD og TED.',
  keywords: 'EU udbud, tenders, ESPD, TED, Danmark, offentlige udbud',
  authors: [{ name: 'EU Tender Platform' }],
  creator: 'EU Tender Platform',
  publisher: 'EU Tender Platform',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'EU Tender Platform - Danmark',
    description: 'Komplet platform til EU-udbud for offentlige enheder i Danmark',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    siteName: 'EU Tender Platform',
    locale: 'da_DK',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EU Tender Platform - Danmark',
    description: 'Komplet platform til EU-udbud for offentlige enheder i Danmark',
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
    google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="da" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          {children}
        </div>
      </body>
    </html>
  )
} 