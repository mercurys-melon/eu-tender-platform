'use client'

import { useEffect, useState } from 'react'
import { getFileIcon, formatFileSize } from '@/lib/storage'

interface Document {
  id: string
  file_name: string
  mime_type: string
  size_bytes: number
  signed_url: string | null
  created_at: string
}

interface DocumentsListProps {
  tenderId: string
}

export default function DocumentsList({ tenderId }: DocumentsListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch(`/api/tenders/${tenderId}/documents`)
        
        if (!response.ok) {
          throw new Error('Kunne ikke hente dokumenter')
        }

        const data = await response.json()
        setDocuments(data.items || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDocuments()
  }, [tenderId])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('da-DK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleDownload = (document: Document) => {
    if (document.signed_url) {
      window.open(document.signed_url, '_blank')
    } else {
      alert('Download link er ikke tilgængeligt')
    }
  }

  const copyDownloadLink = async (document: Document) => {
    if (document.signed_url) {
      try {
        await navigator.clipboard.writeText(document.signed_url)
        alert('Download link kopieret til udklipsholder')
      } catch (err) {
        console.error('Kunne ikke kopiere link:', err)
        alert('Kunne ikke kopiere link')
      }
    }
  }

  const handleDelete = async (document: Document) => {
    if (!confirm(`Er du sikker på, at du vil slette "${document.file_name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/tenders/${tenderId}/documents?id=${document.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kunne ikke slette dokument')
      }

      // Refresh the documents list
      const updatedDocuments = documents.filter(d => d.id !== document.id)
      setDocuments(updatedDocuments)
    } catch (error: any) {
      alert(`Fejl ved sletning: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div>
        <p className="text-center text-slate-grey">⏳ Indlæser dokumenter...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <p className="text-deep-orange text-center">❌ {error}</p>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div>
        <p className="text-slate-grey text-center">
          Ingen dokumenter er tilgængelige endnu.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-h2 mb-4">📁 Dokumenter</h2>
      
      <div className="space-y-3">
        {documents.map((document) => (
          <div
            key={document.id}
            className="flex items-center justify-between p-4 border border-silver-mist rounded-lg hover:bg-silver-mist/30 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-2xl">
                {getFileIcon(document.mime_type)}
              </span>
              
              <div className="flex-1 min-w-0">
                <p className="font-inter font-medium truncate">
                  {document.file_name}
                </p>
                <div className="flex items-center gap-4 text-small text-slate-grey">
                  <span>{formatFileSize(document.size_bytes)}</span>
                  <span>Oprettet: {formatDate(document.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 ml-4">
              <button
                onClick={() => copyDownloadLink(document)}
                className="btn-outline px-3 py-1 text-small"
                disabled={!document.signed_url}
              >
                📋 Kopier link
              </button>
              
              <button
                onClick={() => handleDownload(document)}
                className="btn-primary px-3 py-1 text-small"
                disabled={!document.signed_url}
              >
                ⬇️ Download
              </button>

              <button
                onClick={() => handleDelete(document)}
                className="btn-outline px-3 py-1 text-small"
              >
                🗑️ Slet
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-nordic-blue/10 border border-nordic-blue/20 rounded-lg">
        <p className="text-small text-nordic-blue">
          💡 Download links er gyldige i 6 timer. Hvis et link udløber, kan du generere et nyt ved at genindlæse siden.
        </p>
      </div>
    </div>
  )
}
