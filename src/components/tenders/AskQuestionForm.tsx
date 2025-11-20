'use client'

import { useState } from 'react'

interface AskQuestionFormProps {
  tenderId: string
}

export default function AskQuestionForm({ tenderId }: AskQuestionFormProps) {
  const [formData, setFormData] = useState({
    question_text: '',
    contact_email: '',
    contact_name: '',
    honeypot: '', // Anti-spam field
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [charCount, setCharCount] = useState(0)
  const maxChars = 1000

  const handleInputChange = (field: string, value: string) => {
    if (field === 'question_text') {
      setCharCount(value.length)
    }
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Anti-spam check
    if (formData.honeypot) {
      return
    }

    // Validation
    if (!formData.question_text.trim()) {
      setMessage({ type: 'error', text: 'Spørgsmål er påkrævet' })
      return
    }

    if (formData.question_text.length > maxChars) {
      setMessage({ type: 'error', text: `Spørgsmål er for langt (maks ${maxChars} tegn)` })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/tenders/${tenderId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question_text: formData.question_text.trim(),
          contact_email: formData.contact_email.trim() || undefined,
          contact_name: formData.contact_name.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke sende spørgsmål')
      }

      setMessage({ 
        type: 'success', 
        text: 'Spørgsmål sendt! Det vil blive gennemgået og publiceret snart.' 
      })
      
      // Reset form
      setFormData({
        question_text: '',
        contact_email: '',
        contact_name: '',
        honeypot: '',
      })
      setCharCount(0)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h3 className="text-h3 mb-4">❓ Stil et spørgsmål</h3>
      
      {message && (
        <div className={`p-3 mb-4 rounded ${
          message.type === 'success' 
            ? 'bg-emerald-green/10 text-emerald-green border border-emerald-green/20' 
            : 'bg-deep-orange/10 text-deep-orange border border-deep-orange/20'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="question_text" className="label">
            Dit spørgsmål *
          </label>
          <textarea
            id="question_text"
            value={formData.question_text}
            onChange={(e) => handleInputChange('question_text', e.target.value)}
            className="input resize-none"
            rows={4}
            placeholder="Skriv dit spørgsmål her..."
            maxLength={maxChars}
            required
          />
          <div className="flex justify-between text-small text-slate-grey mt-1">
            <span>Spørgsmål vil blive anonymiseret som standard</span>
            <span>{charCount}/{maxChars}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact_name" className="label">
              Dit navn (valgfrit)
            </label>
            <input
              id="contact_name"
              type="text"
              value={formData.contact_name}
              onChange={(e) => handleInputChange('contact_name', e.target.value)}
              className="input"
              placeholder="Dit navn"
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="contact_email" className="label">
              Din e-mail (valgfrit)
            </label>
            <input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => handleInputChange('contact_email', e.target.value)}
              className="input"
              placeholder="din@email.dk"
            />
          </div>
        </div>

        {/* Honeypot field - hidden from users */}
        <div className="hidden">
          <input
            type="text"
            name="honeypot"
            value={formData.honeypot}
            onChange={(e) => handleInputChange('honeypot', e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="text-small text-slate-grey">
          <p>💡 Tips:</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Vær specifik i dit spørgsmål</li>
            <li>Undgå personlige eller kommercielle oplysninger</li>
            <li>Spørgsmål gennemgåes før publicering</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading || charCount === 0}
          className="btn-primary w-full"
        >
          {loading ? '⏳ Sender...' : '📤 Send spørgsmål'}
        </button>
      </form>
    </div>
  )
}
