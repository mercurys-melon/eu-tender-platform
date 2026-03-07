'use client'

import { useEffect, useState } from 'react'
import { BlockBidCard } from '@/components/ui/blockbid-card'
import { BlockBidButton } from '@/components/ui/blockbid-button'
import { BlockBidInput } from '@/components/ui/blockbid-input'

type BidFormProps = {
  tenderId: string
  onSuccess?: () => void
}

/**
 * BidForm
 * - Henter den loggede bruger via Supabase Auth
 * - Indsender bud til 'bids' tabellen via API route
 * - Understøtter pris, kommentar og dokument-upload
 * - Forberedt til "pris fra fil" funktionalitet
 */
export default function BidForm({ tenderId, onSuccess }: BidFormProps) {
  const [price, setPrice] = useState<number | ''>('')
  const [currency, setCurrency] = useState('DKK')
  const [comment, setComment] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    // Validate file types
    const allowedTypes = ['.pdf', '.xls', '.xlsx', 'application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    const validFiles = selectedFiles.filter(file => {
      const fileName = file.name.toLowerCase()
      const fileType = file.type
      return allowedTypes.some(type => fileName.endsWith(type) || fileType === type)
    })

    if (validFiles.length !== selectedFiles.length) {
      setError('Nogle filer blev ignoreret. Kun PDF, XLS og XLSX filer er tilladt.')
    }

    setFiles(prev => [...prev, ...validFiles])

    // TODO: Prepare for "price from file" feature
    // When implemented, call extractPriceFromFile() here or after upload
    // Example: const extractedPrice = await extractPriceFromFile(validFiles[0])
    // if (extractedPrice) setPrice(extractedPrice)
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (price === '' || Number.isNaN(Number(price)) || Number(price) <= 0) {
      setError('Angiv et gyldigt beløb.')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('tender_id', tenderId)
      formData.append('price', String(price))
      formData.append('currency', currency)
      formData.append('comment', comment)
      
      files.forEach((file, index) => {
        formData.append(`documents`, file)
      })

      const response = await fetch('/api/bids', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Kunne ikke indsende bud.')
      }

      // Reset form
      setPrice('')
      setCurrency('DKK')
      setComment('')
      setFiles([])
      setSuccess(true)
      
      if (onSuccess) onSuccess()
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message ?? 'Kunne ikke indsende bud.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <BlockBidCard variant="hover">
      <h2 className="text-h3 mb-4" style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>
        Afgiv bud
      </h2>

      {success && (
        <div className="mb-4 p-4 bg-hint-green/10 border border-hint-green/30 rounded-full text-hint-green" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
          ✅ Dit bud er indsendt!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BlockBidInput
            label="Pris (DKK) *"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0.00"
            required
            min="0"
            step="0.01"
          />

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-granite-grey mb-1" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
              Valuta
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-full border border-soft-sand px-4 py-2 focus:outline-none focus:ring-2 focus:ring-xp-sky-blue/50 focus:border-xp-sky-blue transition-all"
              style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
            >
              <option value="DKK">DKK</option>
              <option value="EUR">EUR</option>
              <option value="SEK">SEK</option>
              <option value="NOK">NOK</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-granite-grey mb-1" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
            Kommentar (valgfri)
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tilføj kommentarer til dit bud..."
            rows={4}
            className="w-full rounded-[20px] border border-soft-sand px-4 py-2 focus:outline-none focus:ring-2 focus:ring-xp-sky-blue/50 focus:border-xp-sky-blue transition-all"
            style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
          />
        </div>

        <div>
          <label htmlFor="documents" className="block text-sm font-medium text-granite-grey mb-1" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
            Dokumenter (PDF, XLS, XLSX) - valgfri
          </label>
          <input
            id="documents"
            type="file"
            accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            multiple
            onChange={handleFileChange}
            className="w-full rounded-full border border-soft-sand px-4 py-2 focus:outline-none focus:ring-2 focus:ring-xp-sky-blue/50 focus:border-xp-sky-blue transition-all"
          />
          {files.length > 0 && (
            <div className="mt-2 space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-soft-sand/50 rounded-full text-sm">
                  <span className="text-digital-navy" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-sunset-orange hover:text-digital-navy"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-sunset-orange bg-sunset-orange/10 p-3 rounded-full border border-sunset-orange/30" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
            {error}
          </div>
        )}

        <BlockBidButton type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Indsender...' : 'Indsend bud'}
        </BlockBidButton>
      </form>
    </BlockBidCard>
  )
}
