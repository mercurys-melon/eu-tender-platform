import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import TenderDetailsClient from './TenderDetailsClient'

interface Tender {
  id: string
  title: string
  description: string
  entity_id: string
  category: string
  estimated_value: number
  currency: string
  submission_deadline: string
  publication_date: string
  status: string
  espd_required: boolean
  ted_published: boolean
  created_at: string
}

// Generate dynamic metadata for each tender page
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    // Fetch minimal tender data for metadata
    const supabase = createClient()
    const { data: tender } = await supabase
      .from('tenders')
      .select('title, description')
      .eq('id', params.id)
      .single()

    const title = tender?.title 
      ? `${tender.title} – BlockBid`
      : `Udbud #${params.id} – BlockBid`
    
    const description = tender?.description 
      ? tender.description.substring(0, 160) + (tender.description.length > 160 ? '...' : '')
      : 'Se detaljer for dette udbud på BlockBid'

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tenders/${params.id}`,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    }
  } catch (error) {
    // Fallback metadata if tender fetch fails
    const title = `Udbud #${params.id} – BlockBid`
    return {
      title,
      description: 'Se detaljer for dette udbud på BlockBid',
      openGraph: {
        title,
        type: 'website',
      },
    }
  }
}

export default async function TenderDetailsPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  let tender: Tender | null = null

  try {
    const { data } = await supabase
      .from('tenders')
      .select('*')
      .eq('id', params.id)
      .single()

    tender = (data as Tender | null) ?? null
  } catch (error) {
    console.error('Failed to prefetch tender', error)
  }

  return <TenderDetailsClient id={params.id} initialTender={tender} />
}
