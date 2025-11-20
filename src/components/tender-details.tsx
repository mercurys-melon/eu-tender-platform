import Link from 'next/link'
import { MinecraftCard } from '@/components/ui/minecraft-card'
import { MinecraftButton } from '@/components/ui/minecraft-button'
import { formatDate, formatCurrency } from '@/lib/utils/format'

interface TenderDetailsProps {
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
    status: 'draft' | 'published' | 'closed' | 'awarded'
    espd_required: boolean
    ted_published: boolean
    created_at: string
    created_by?: string
  }
  user?: {
    email: string
  } | null
}

const statusColors = {
  draft: 'bg-gray-600 text-white',
  published: 'bg-green-600 text-white',
  closed: 'bg-red-600 text-white',
  awarded: 'bg-blue-600 text-white',
}

const statusLabels = {
  draft: 'Kladde',
  published: 'Publiceret',
  closed: 'Lukket',
  awarded: 'Tildelt',
}

export function TenderDetails({ tender, user }: TenderDetailsProps) {
  const isDeadlinePassed = new Date(tender.submission_deadline) < new Date()
  const isRecentlyPublished = new Date(tender.publication_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  return (
    <div className="space-y-6">
      {/* Header med tilbage-knap */}
      <div className="flex items-center justify-between">
        <Link href="/tenders">
          <MinecraftButton variant="secondary" size="sm">
            ← Tilbage til Udbud
          </MinecraftButton>
        </Link>
        
        <div className="flex gap-2">
          <span className={`font-minecraft px-3 py-1 text-sm font-bold border-2 border-b-4 ${statusColors[tender.status]}`}>
            {statusLabels[tender.status]}
          </span>
          {isRecentlyPublished && (
            <span className="font-minecraft px-3 py-1 text-sm font-bold border-2 border-b-4 bg-yellow-500 text-white">
              NY
            </span>
          )}
        </div>
      </div>

      {/* Hovedindhold */}
      <MinecraftCard className="mb-6">
        <div className="mb-6">
          <h1 className="font-minecraft text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            {tender.title}
          </h1>
          
          <div className="font-minecraft text-gray-600 text-lg leading-relaxed">
            {tender.description}
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div className="font-minecraft">
              <span className="text-gray-500 text-sm">Enhed:</span>
              <div className="font-bold text-gray-800 text-lg">{tender.entity_id}</div>
            </div>
            
            <div className="font-minecraft">
              <span className="text-gray-500 text-sm">Kategori:</span>
              <div className="font-bold text-gray-800 text-lg">{tender.category}</div>
            </div>
            
            <div className="font-minecraft">
              <span className="text-gray-500 text-sm">Estimeret Værdi:</span>
              <div className="font-bold text-gray-800 text-lg">
                {formatCurrency(tender.estimated_value, tender.currency)}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="font-minecraft">
              <span className="text-gray-500 text-sm">Deadline:</span>
              <div className="font-bold text-gray-800 text-lg">
                {formatDate(tender.submission_deadline)}
              </div>
            </div>
            
            <div className="font-minecraft">
              <span className="text-gray-500 text-sm">Publiceret:</span>
              <div className="font-bold text-gray-800 text-lg">
                {formatDate(tender.publication_date)}
              </div>
            </div>
            
            <div className="font-minecraft">
              <span className="text-gray-500 text-sm">Oprettet:</span>
              <div className="font-bold text-gray-800 text-lg">
                {formatDate(tender.created_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Tags og Status */}
        <div className="flex flex-wrap gap-2 mb-4">
          {tender.espd_required && (
            <span className="font-minecraft px-3 py-1 text-sm font-bold border-2 border-b-4 bg-blue-500 text-white">
              ESPD Påkrævet
            </span>
          )}
          {tender.ted_published && (
            <span className="font-minecraft px-3 py-1 text-sm font-bold border-2 border-b-4 bg-green-500 text-white">
              TED Publiceret
            </span>
          )}
        </div>

        {/* Deadline Status */}
        <div className="font-minecraft text-sm">
          {isDeadlinePassed ? (
            <span className="text-red-600 font-bold">⚠️ Deadline overskredet</span>
          ) : (
            <span className="text-green-600 font-bold">
              ⏰ {formatDate(tender.submission_deadline, 'relative')} tilbage
            </span>
          )}
        </div>

        {/* Oprettet af */}
        {user && (
          <div className="mt-4 pt-4 border-t-2 border-gray-300">
            <div className="font-minecraft text-sm text-gray-500">
              Oprettet af: <span className="font-bold text-gray-800">{user.email}</span>
            </div>
          </div>
        )}
      </MinecraftCard>
    </div>
  )
} 