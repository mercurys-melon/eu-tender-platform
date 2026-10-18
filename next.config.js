/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'your-supabase-project.supabase.co'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY || "", // fallback til tom string
  },
  // Legacy-ruter (Cursor-perioden) → (app)-ruter. Jf. TODO-ROUTE-MIGRATION.md pkt. 1.
  async redirects() {
    return [
      { source: '/buyer', destination: '/ordregiver', permanent: true },
      { source: '/buyer/opret', destination: '/ordregiver/opret', permanent: true },
      { source: '/buyer/:path*', destination: '/ordregiver', permanent: true },
      { source: '/supplier', destination: '/tilbudsgiver', permanent: true },
      { source: '/supplier/:path*', destination: '/tilbudsgiver', permanent: true },
      { source: '/dashboard/:path*', destination: '/ordregiver', permanent: true },
      { source: '/dashboard', destination: '/ordregiver', permanent: true },
      { source: '/create', destination: '/ordregiver/opret', permanent: true },
      { source: '/marketing', destination: '/', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
