'use client'

import { useEffect, useState } from 'react'

interface Question {
  id: string
  question_text: string
  answer_text: string | null
  is_anonymized: boolean
  created_at: string
  updated_at: string
}

interface QnAListProps {
  tenderId: string
}

export default function QnAList({ tenderId }: QnAListProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(`/api/tenders/${tenderId}/questions?status=published`)
        
        if (!response.ok) {
          throw new Error('Kunne ikke hente spørgsmål')
        }

        const data = await response.json()
        setQuestions(data.items || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [tenderId])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('da-DK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div>
        <p className="text-center">⏳ Indlæser spørgsmål...</p>
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

  if (questions.length === 0) {
    return (
      <div>
        <p className="text-slate-grey text-center">
          Ingen spørgsmål er stillet endnu.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-h2 mb-4">📋 Spørgsmål & Svar</h2>
      
      {questions.map((question) => (
        <div key={question.id} className="p-4 border border-silver-mist rounded-lg">
          <div className="space-y-4">
            {/* Question */}
            <div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">❓</span>
                <div className="flex-1">
                  <p className="text-lg mb-2">
                    {question.question_text}
                  </p>
                  <div className="flex items-center gap-4 text-small text-slate-grey">
                    <span>
                      {question.is_anonymized ? 'Anonym spørger' : 'Navngivet spørger'}
                    </span>
                    <span>Stillet: {formatDate(question.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Answer */}
            {question.answer_text && (
              <div className="border-l-4 border-emerald-green pl-4 ml-8">
                <div className="flex items-start gap-3">
                  <span className="text-xl">💬</span>
                  <div className="flex-1">
                    <p className="text-lg mb-2">
                      {question.answer_text}
                    </p>
                    <div className="text-small text-slate-grey">
                      Besvaret: {formatDate(question.updated_at)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!question.answer_text && (
              <div className="border-l-4 border-deep-orange pl-4 ml-8">
                <div className="flex items-center gap-3">
                  <span className="text-xl">⏳</span>
                  <p className="text-slate-grey">
                    Svar afventer
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
