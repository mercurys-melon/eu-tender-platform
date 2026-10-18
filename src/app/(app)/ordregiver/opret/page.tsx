'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BuyerCreateTender() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    value: '',
    category: '',
    documents: [] as File[],
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.deadline) {
      setError('Vælg venligst en indsendingsfrist')
      return
    }

    setLoading(true)

    // Parse estimated value: strip non-numeric chars, support both . and , as decimal separator
    const rawValue = formData.value.replace(/[^0-9.,]/g, '').replace(',', '.')
    const estimatedValue = rawValue ? parseFloat(rawValue) : null

    try {
      const res = await fetch('/api/tenders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          submission_deadline: new Date(formData.deadline).toISOString(),
          estimated_value: estimatedValue,
          category: formData.category || null,
          currency: 'DKK',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Noget gik galt. Prøv igen.')
        return
      }

      router.push(`/tenders/${data.id}/manage`)
    } catch {
      setError('Netværksfejl. Tjek din forbindelse og prøv igen.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({ ...prev, documents: Array.from(e.target.files || []) }))
    }
  }

  return (
    <>
      <h1 className="text-h2 mb-4">Opret udbud</h1>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="label">Titel</label>
          <input
            type="text"
            className="input"
            placeholder="F.eks. IT-udstyr til kommunen"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="label">Beskrivelse</label>
          <textarea
            className="input min-h-32"
            placeholder="Beskriv udbuddet i detaljer..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Indsendingsfrist</label>
            <input
              type="date"
              className="input"
              value={formData.deadline}
              onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label">Estimeret værdi (valgfrit)</label>
            <input
              type="text"
              className="input"
              placeholder="F.eks. 500.000 kr"
              value={formData.value}
              onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="label">Kategori (valgfrit)</label>
          <input
            type="text"
            className="input"
            placeholder="F.eks. IT Services, Rengøring, Byggeri"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
          />
        </div>

        <div>
          <label className="label">Dokumenter (valgfrit)</label>
          <input
            type="file"
            multiple
            className="input"
            onChange={handleFileChange}
          />
          {formData.documents.length > 0 && (
            <p className="mt-2 text-sm text-granite-grey">
              {formData.documents.length} fil(er) valgt — kan uploades efter oprettelse
            </p>
          )}
        </div>

        <button type="submit" className="btn-primary" disabled={!mounted || loading}>
          {loading ? 'Opretter...' : 'Opret udbud'}
        </button>
      </form>
    </>
  )
}
