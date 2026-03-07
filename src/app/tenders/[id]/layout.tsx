import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TenderStatusBadge } from '@/components/tenders/TenderStatusBadge'
import { TenderTabs } from './TenderTabs'

async function getTender(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tenders')
    .select('id, title, status')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

export default async function TenderLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const tender = await getTender(params.id)

  if (!tender) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-xp-sky-blue/5">
      <div className="container-blockbid py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-h1" style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>
              {tender.title}
            </h1>
            <TenderStatusBadge status={tender.status as any} />
          </div>
        </div>

        {/* Tab Navigation */}
        <TenderTabs tenderId={params.id} />

        {/* Content */}
        {children}
      </div>
    </div>
  )
}
