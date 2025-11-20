import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BlockBid - Find og vind flere udbud hurtigere',
  description: 'BlockBid hjælper virksomheder med at finde relevante udbud, overvåge nye muligheder og øge deres chancer for at vinde kontrakter. EU-udbud, nationale udbud, CPV-filtrering og automatiske notifikationer.',
  keywords: 'udbud, eu-udbud, nationale udbud, cpv-kode, espd, leverandør, overvågning, notifikationer, danmark, udbudsplatform',
  authors: [{ name: 'BlockBid' }],
  creator: 'BlockBid',
  publisher: 'BlockBid',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'BlockBid - Find og vind flere udbud hurtigere',
    description: 'BlockBid hjælper virksomheder med at finde relevante udbud, overvåge nye muligheder og øge deres chancer for at vinde kontrakter.',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    siteName: 'BlockBid',
    locale: 'da_DK',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BlockBid - Find og vind flere udbud hurtigere',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BlockBid - Find og vind flere udbud hurtigere',
    description: 'BlockBid hjælper virksomheder med at finde relevante udbud, overvåge nye muligheder og øge deres chancer for at vinde kontrakter.',
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
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/marketing`,
  },
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
