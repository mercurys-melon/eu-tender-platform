export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { TenderCard } from '@/components/tender-card'
import { Breadcrumb } from '@/components/ui/breadcrumb'

export const metadata: Metadata = {
  title: 'Aktuelle udbud – Mercurry Tender',
  description: 'Offentlige udbud publiceret via Mercurry Tender.',
}

/**
 * Offentlig liste over udbud publiceret på platformen.
 * Kladder vises aldrig (filtreres her OG via tenders-RLS, migration 20261018120000).
 */
export default async function TendersPage() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tenders')
    .select('id, title, description, submission_deadline, status, category, estimated_value, currency')
    .neq('status', 'draft')
    .order('submission_deadline', { ascending: true })
    .limit(100)

  if (error) console.error('[tenders] kunne ikke hente udbud:', error.message)

  const now = Date.now()
  const tenders = (data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    deadline: t.submission_deadline,
    status: (t.status === 'published' && new Date(t.submission_deadline).getTime() > now
      ? 'active'
      : t.status === 'published'
        ? 'pending'
        : 'closed') as 'active' | 'pending' | 'closed',
    category: t.category || 'Øvrige',
    budget:
      t.estimated_value > 0
        ? `${new Intl.NumberFormat('da-DK').format(t.estimated_value)} ${t.currency}`
        : undefined,
  }))

  return (
    <div className="min-h-screen bg-arctic-white">
      <div className="bg-silver-mist/30 border-b border-silver-mist">
        <div className="container-blockbid py-4">
          <Breadcrumb
            items={[
              { label: 'Forside', href: '/' },
              { label: 'Udbud', href: '/tenders' },
            ]}
          />
        </div>
      </div>

      <section className="section-blockbid">
        <div className="container-blockbid">
          <div className="text-center mb-12">
            <h1 className="text-h1 mb-4">Aktuelle udbud</h1>
            <p className="text-slate-grey text-lg max-w-3xl mx-auto">
              Udbud publiceret via Mercurry Tender. Udbudsmaterialet er frit tilgængeligt –
              log ind for at stille spørgsmål eller afgive tilbud.
            </p>
          </div>

          {tenders.length === 0 ? (
            <p className="text-center text-slate-grey py-12">Der er ingen aktuelle udbud lige nu.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tenders.map((tender) => (
                <TenderCard key={tender.id} tender={tender} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
