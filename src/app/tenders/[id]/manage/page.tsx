'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { MinecraftCard } from '@/components/ui/minecraft-card'
import { MinecraftButton } from '@/components/ui/minecraft-button'
import TenderDetailsHeader from '@/components/tenders/TenderDetailsHeader'
import QnAModerationPanel from '@/components/tenders/QnAModerationPanel'
import DocumentsUploader from '@/components/tenders/DocumentsUploader'
import DocumentsList from '@/components/tenders/DocumentsList'

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

export default function TenderManagePage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : undefined
  const router = useRouter()

  const [tender, setTender] = useState<Tender | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'qna' | 'documents'>('qna')

  useEffect(() => {
    if (!id) {
      setError('Intet udbuds-ID i URL.')
      setLoading(false)
      return
    }

    const fetchTenderAndUser = async () => {
      try {
        // Fetch tender
        const { data: tenderData, error: tenderError } = await supabase
          .from('tenders')
          .select('*')
          .eq('id', id)
          .single()

        if (tenderError) {
          console.error('Error fetching tender:', tenderError)
          throw tenderError
        }
        
        setTender(tenderData)

        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        setUser(currentUser)

        // Check if user is owner
        if (currentUser && tenderData) {
          const ownerCheck = currentUser.id === tenderData.entity_id
          setIsOwner(ownerCheck)
          
          if (!ownerCheck) {
            setError('Du har ikke tilladelse til at administrere dette udbud.')
          }
        } else {
          setError('Du skal være logget ind for at administrere udbud.')
        }

      } catch (err: any) {
        console.error('Error in fetchTenderAndUser:', err)
        setError(err.message || 'Kunne ikke hente udbuddet.')
      } finally {
        setLoading(false)
      }
    }

    fetchTenderAndUser()
  }, [id])

  const handleUploadComplete = () => {
    // This will trigger a refresh of the documents list
    // The DocumentsList component will refetch automatically
  }

  if (loading) {
    return <p className="font-minecraft text-lg text-center mt-10">⏳ Indlæser udbudsdetaljer...</p>
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <MinecraftCard className="p-6">
          <p className="font-minecraft text-red-600 text-center mb-4">❌ {error}</p>
          <div className="text-center">
            <MinecraftButton onClick={() => router.push('/tenders')}>
              ⬅ Tilbage til oversigten
            </MinecraftButton>
          </div>
        </MinecraftCard>
      </div>
    )
  }

  if (!tender || !isOwner) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <MinecraftCard className="p-6">
          <p className="font-minecraft text-gray-600 text-center mb-4">
            Du har ikke tilladelse til at administrere dette udbud.
          </p>
          <div className="text-center">
            <MinecraftButton onClick={() => router.push('/tenders')}>
              ⬅ Tilbage til oversigten
            </MinecraftButton>
          </div>
        </MinecraftCard>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <TenderDetailsHeader tender={tender} isOwner={isOwner} />

      {/* Management Tabs */}
      <MinecraftCard className="p-6 mb-6">
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('qna')}
            className={`px-6 py-3 font-minecraft text-lg ${
              activeTab === 'qna'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            ❓ Spørgsmål & Svar
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-6 py-3 font-minecraft text-lg ${
              activeTab === 'documents'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📁 Dokumenter
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'qna' && (
          <div>
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-minecraft text-blue-800 mb-2">💡 Q&A Administration</h4>
              <ul className="font-minecraft text-sm text-blue-700 space-y-1">
                <li>• Gennemgå og rediger spørgsmål før publicering</li>
                <li>• Anonymiser spørgsmål for at beskytte spørgerens identitet</li>
                <li>• Besvar spørgsmål og publicer dem</li>
                <li>• Afpublicer spørgsmål hvis nødvendigt</li>
              </ul>
            </div>
            <QnAModerationPanel tenderId={tender.id} />
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-minecraft text-green-800 mb-2">📁 Dokument Administration</h4>
              <ul className="font-minecraft text-sm text-green-700 space-y-1">
                <li>• Upload dokumenter til udbuddet</li>
                <li>• Dokumenter er kun tilgængelige via sikre download links</li>
                <li>• Slet dokumenter hvis de ikke længere er relevante</li>
                <li>• Alle dokumenter er automatisk organiseret per udbud</li>
              </ul>
            </div>

            {/* Upload Section */}
            <DocumentsUploader 
              tenderId={tender.id} 
              onUploadComplete={handleUploadComplete}
            />

            {/* Documents List */}
            <DocumentsList tenderId={tender.id} />
          </div>
        )}
      </MinecraftCard>
    </div>
  )
}
