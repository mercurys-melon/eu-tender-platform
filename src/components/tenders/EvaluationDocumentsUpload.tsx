'use client'

import { useState, useRef } from 'react'
import { BlockBidCard } from '@/components/ui/blockbid-card'
import { BlockBidButton } from '@/components/ui/blockbid-button'
import { getFileIcon } from '@/lib/storage'

interface EvaluationDocumentsUploadProps {
  tenderId: string
  initialDocuments: Array<{ path: string; fileName: string; url: string | null }>
}

export function EvaluationDocumentsUpload({ tenderId, initialDocuments }: EvaluationDocumentsUploadProps) {
  const [documents, setDocuments] = useState(initialDocuments)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('files', file)
      })

      const response = await fetch(`/api/tenders/${tenderId}/evaluation-documents`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kunne ikke uploade filer')
      }

      // Refresh documents list
      const docsResponse = await fetch(`/api/tenders/${tenderId}/evaluation-documents`)
      if (docsResponse.ok) {
        const docsData = await docsResponse.json()
        setDocuments(docsData.documents || [])
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <BlockBidCard>
      <div className="mb-6">
        <h3 className="text-h3 text-digital-navy mb-2" style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>
          Evalueringsdokumenter
        </h3>
        <p className="text-granite-grey text-sm" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
          Upload dine evalueringsark (fx Excel/PDF), så de er samlet med udbuddet.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xls,.xlsx"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id="evaluation-file-input"
          />
          <label htmlFor="evaluation-file-input">
            <BlockBidButton
              variant="secondary"
              size="md"
              {...{ as: 'span' } as any}
              className="cursor-pointer"
              disabled={uploading}
            >
              {uploading ? 'Uploader...' : 'Upload evalueringsark'}
            </BlockBidButton>
          </label>
        </div>

        {error && (
          <div className="p-3 bg-sunset-orange/10 border border-sunset-orange/30 rounded-lg">
            <p className="text-sm text-sunset-orange" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
              {error}
            </p>
          </div>
        )}

        {documents.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-digital-navy" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
              Uploadede dokumenter:
            </h4>
            <ul className="space-y-2">
              {documents.map((doc, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3 p-3 bg-soft-sand/30 rounded-lg border border-soft-sand/50"
                >
                  <span className="text-xl">{getFileIcon('application/pdf')}</span>
                  <div className="flex-1">
                    <p className="text-sm text-digital-navy font-medium" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                      {doc.fileName}
                    </p>
                  </div>
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-xp-sky-blue hover:text-digital-navy transition-colors"
                      style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
                    >
                      Download
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {documents.length === 0 && !uploading && (
          <p className="text-sm text-granite-grey italic" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
            Ingen evalueringsdokumenter uploadet endnu.
          </p>
        )}
      </div>
    </BlockBidCard>
  )
}

