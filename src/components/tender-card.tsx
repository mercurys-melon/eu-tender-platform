import Link from 'next/link'
import { Calendar, DollarSign, Building, FileText, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate, formatCurrency } from '@/lib/utils/format'

interface TenderCardProps {
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
  }
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  published: 'bg-green-100 text-green-800',
  closed: 'bg-red-100 text-red-800',
  awarded: 'bg-blue-100 text-blue-800',
}

const statusLabels = {
  draft: 'Kladde',
  published: 'Publiceret',
  closed: 'Lukket',
  awarded: 'Tildelt',
}

export function TenderCard({ tender }: TenderCardProps) {
  const isDeadlinePassed = new Date(tender.submission_deadline) < new Date()
  const isRecentlyPublished = new Date(tender.publication_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2 mb-2">
              {tender.title}
            </CardTitle>
            <CardDescription className="line-clamp-3">
              {tender.description}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[tender.status]}`}>
              {statusLabels[tender.status]}
            </span>
            {isRecentlyPublished && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Ny
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">Enhed: {tender.entity_id}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">Kategori: {tender.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">
              Værdi: {formatCurrency(tender.estimated_value, tender.currency)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">
              Deadline: {formatDate(tender.submission_deadline)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>
              {isDeadlinePassed ? 'Deadline overskredet' : `${formatDate(tender.submission_deadline, 'relative')} tilbage`}
            </span>
          </div>
          <div className="flex gap-2">
            {tender.espd_required && (
              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                ESPD
              </span>
            )}
            {tender.ted_published && (
              <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                TED
              </span>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/tenders/${tender.id}`}>
            Se Detaljer
          </Link>
        </Button>
        {tender.status === 'published' && !isDeadlinePassed && (
          <Button size="sm" asChild>
            <Link href={`/tenders/${tender.id}/bid`}>
              Byde Nu
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
} 