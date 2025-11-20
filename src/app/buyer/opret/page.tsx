'use client'

import { useState } from 'react'

export default function BuyerCreateTender() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    value: '',
    documents: [] as File[]
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement tender creation
    console.log('Creating tender:', formData)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({
        ...prev,
        documents: Array.from(e.target.files || [])
      }))
    }
  }

  return (
    <>
      <h1 className="text-h2 mb-4">Opret udbud</h1>
      
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
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
            <label className="label">Frist</label>
            <input
              type="date"
              className="input"
              value={formData.deadline}
              onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label">Værdi (valgfrit)</label>
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
          <label className="label">Dokumenter (valgfrit)</label>
          <input
            type="file"
            multiple
            className="input"
            onChange={handleFileChange}
          />
          {formData.documents.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-granite-grey">
                {formData.documents.length} fil(er) valgt
              </p>
            </div>
          )}
        </div>

        <button type="submit" className="btn-primary">
          Opret udbud
        </button>
      </form>
    </>
  )
}
