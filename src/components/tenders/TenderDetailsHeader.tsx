'use client'

import { MinecraftCard } from '@/components/ui/minecraft-card'
import { MinecraftButton } from '@/components/ui/minecraft-button'
import { useRouter } from 'next/navigation'

interface TenderDetailsHeaderProps {
  tender: {
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
  }
  isOwner: boolean
}

export default function TenderDetailsHeader({ tender, isOwner }: TenderDetailsHeaderProps) {
  const router = useRouter()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('da-DK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'text-green-600'
      case 'draft':
        return 'text-yellow-600'
      case 'closed':
        return 'text-red-600'
      case 'awarded':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published':
        return 'Publiceret'
      case 'draft':
        return 'Kladde'
      case 'closed':
        return 'Lukket'
      case 'awarded':
        return 'Tildelt'
      default:
        return status
    }
  }

  return (
    <MinecraftCard className="p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
        <div className="flex-1">
          <h1 className="font-minecraft text-3xl mb-4">{tender.title}</h1>
          <p className="font-minecraft text-gray-700 mb-6 leading-relaxed">
            {tender.description}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-minecraft">
            <div className="space-y-2">
              <p><strong>Ansvarlig enhed:</strong> {tender.entity_id}</p>
              <p><strong>Kategori:</strong> {tender.category}</p>
              <p><strong>Værdi:</strong> {formatCurrency(tender.estimated_value, tender.currency)}</p>
              <p><strong>Status:</strong> 
                <span className={`ml-2 ${getStatusColor(tender.status)}`}>
                  {getStatusText(tender.status)}
                </span>
              </p>
            </div>
            
            <div className="space-y-2">
              <p><strong>Publiceret:</strong> {formatDate(tender.publication_date)}</p>
              <p><strong>Deadline:</strong> {formatDate(tender.submission_deadline)}</p>
              <p><strong>ESPD påkrævet:</strong> {tender.espd_required ? 'Ja' : 'Nej'}</p>
              <p><strong>TED-publiceret:</strong> {tender.ted_published ? 'Ja' : 'Nej'}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 min-w-fit">
          <MinecraftButton 
            onClick={() => router.push('/tenders')}
            className="w-full"
          >
            ⬅ Tilbage til oversigten
          </MinecraftButton>

          {isOwner && (
            <MinecraftButton 
              onClick={() => router.push(`/tenders/${tender.id}/manage`)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              ⚙️ Administrer udbud
            </MinecraftButton>
          )}
        </div>
      </div>
    </MinecraftCard>
  )
}
