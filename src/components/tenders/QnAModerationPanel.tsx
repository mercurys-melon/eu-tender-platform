'use client'

import { useState, useEffect } from 'react'
import { MinecraftCard } from '@/components/ui/minecraft-card'
import { MinecraftButton } from '@/components/ui/minecraft-button'
import { MinecraftInput } from '@/components/ui/minecraft-input'

interface Question {
  id: string
  question_text: string
  question_text_public: string
  answer_text: string | null
  is_published: boolean
  is_anonymized: boolean
  contact_email: string | null
  contact_name: string | null
  created_at: string
  updated_at: string
}

interface QnAModerationPanelProps {
  tenderId: string
}

export default function QnAModerationPanel({ tenderId }: QnAModerationPanelProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'unpublished' | 'published'>('unpublished')
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null)
  const [editData, setEditData] = useState<{
    question_text_public: string
    is_anonymized: boolean
    answer_text: string
  }>({
    question_text_public: '',
    is_anonymized: true,
    answer_text: '',
  })

  useEffect(() => {
    fetchQuestions()
  }, [tenderId])

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`/api/tenders/${tenderId}/questions?status=all`)
      
      if (!response.ok) {
        throw new Error('Kunne ikke hente spÃ¸rgsmÃ¥l')
      }

      const data = await response.json()
      setQuestions(data.items || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (question: Question) => {
    setEditingQuestion(question.id)
    setEditData({
      question_text_public: question.question_text_public,
      is_anonymized: question.is_anonymized,
      answer_text: question.answer_text || '',
    })
  }

  const handleSave = async (questionId: string) => {
    try {
      const response = await fetch(`/api/tenders/${tenderId}/questions/${questionId}/moderate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kunne ikke opdatere spÃ¸rgsmÃ¥l')
      }

      setEditingQuestion(null)
      fetchQuestions() // Refresh the list
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handlePublish = async (questionId: string) => {
    try {
      const response = await fetch(`/api/tenders/${tenderId}/questions/${questionId}/moderate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publish: true }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kunne ikke publicere spÃ¸rgsmÃ¥l')
      }

      fetchQuestions() // Refresh the list
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleUnpublish = async (questionId: string) => {
    try {
      const response = await fetch(`/api/tenders/${tenderId}/questions/${questionId}/moderate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ unpublish: true }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kunne ikke afpublicere spÃ¸rgsmÃ¥l')
      }

      fetchQuestions() // Refresh the list
    } catch (error: any) {
      alert(error.message)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('da-DK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredQuestions = questions.filter(q => 
    activeTab === 'unpublished' ? !q.is_published : q.is_published
  )

  if (loading) {
    return (
      <MinecraftCard className="p-6">
        <p className="font-minecraft text-center">â³ IndlÃ¦ser spÃ¸rgsmÃ¥l...</p>
      </MinecraftCard>
    )
  }

  if (error) {
    return (
      <MinecraftCard className="p-6">
        <p className="font-minecraft text-red-600 text-center">âŒ {error}</p>
      </MinecraftCard>
    )
  }

  return (
    <MinecraftCard className="p-6">
      <h3 className="font-minecraft text-xl mb-4">âš™ï¸ Q&A Moderation</h3>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('unpublished')}
          className={`px-4 py-2 font-minecraft ${
            activeTab === 'unpublished'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Upublicerede ({questions.filter(q => !q.is_published).length})
        </button>
        <button
          onClick={() => setActiveTab('published')}
          className={`px-4 py-2 font-minecraft ${
            activeTab === 'published'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Publicerede ({questions.filter(q => q.is_published).length})
        </button>
      </div>

      {filteredQuestions.length === 0 ? (
        <p className="font-minecraft text-gray-600 text-center">
          {activeTab === 'unpublished' 
            ? 'Ingen upublicerede spÃ¸rgsmÃ¥l' 
            : 'Ingen publicerede spÃ¸rgsmÃ¥l'
          }
        </p>
      ) : (
        <div className="space-y-6">
          {filteredQuestions.map((question) => (
            <div key={question.id} className="border border-gray-200 rounded-lg p-4">
              {/* Original Question (hidden for published) */}
              {activeTab === 'unpublished' && (
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <p className="font-minecraft text-sm text-gray-600 mb-2">
                    <strong>Originalt spÃ¸rgsmÃ¥l:</strong>
                  </p>
                  <p className="font-minecraft">{question.question_text}</p>
                  {question.contact_email && (
                    <p className="font-minecraft text-xs text-gray-500 mt-1">
                      Kontakt: {question.contact_email}
                      {question.contact_name && ` (${question.contact_name})`}
                    </p>
                  )}
                </div>
              )}

              {/* Public Question */}
              <div className="mb-4">
                <label className="block font-minecraft mb-2">
                  Publiceret spÃ¸rgsmÃ¥l:
                </label>
                {editingQuestion === question.id ? (
                  <textarea
                    value={editData.question_text_public}
                    onChange={(e) => setEditData(prev => ({
                      ...prev,
                      question_text_public: e.target.value
                    }))}
                    className="w-full p-3 border border-gray-300 rounded font-minecraft resize-none"
                    rows={3}
                    maxLength={1000}
                  />
                ) : (
                  <p className="font-minecraft p-3 bg-white border border-gray-300 rounded">
                    {question.question_text_public}
                  </p>
                )}
              </div>

              {/* Anonymization */}
              <div className="mb-4">
                <label className="flex items-center font-minecraft">
                  <input
                    type="checkbox"
                    checked={editingQuestion === question.id ? editData.is_anonymized : question.is_anonymized}
                    onChange={(e) => {
                      if (editingQuestion === question.id) {
                        setEditData(prev => ({ ...prev, is_anonymized: e.target.checked }))
                      }
                    }}
                    disabled={editingQuestion !== question.id}
                    className="mr-2"
                  />
                  Anonymiser spÃ¸rgsmÃ¥l
                </label>
              </div>

              {/* Answer */}
              <div className="mb-4">
                <label className="block font-minecraft mb-2">
                  Svar:
                </label>
                {editingQuestion === question.id ? (
                  <textarea
                    value={editData.answer_text}
                    onChange={(e) => setEditData(prev => ({
                      ...prev,
                      answer_text: e.target.value
                    }))}
                    className="w-full p-3 border border-gray-300 rounded font-minecraft resize-none"
                    rows={4}
                    maxLength={2000}
                    placeholder="Skriv dit svar her..."
                  />
                ) : (
                  <p className="font-minecraft p-3 bg-white border border-gray-300 rounded min-h-[60px]">
                    {question.answer_text || 'Intet svar endnu'}
                  </p>
                )}
              </div>

              {/* Metadata */}
              <div className="text-sm text-gray-600 mb-4">
                <p>Stillet: {formatDate(question.created_at)}</p>
                {question.updated_at !== question.created_at && (
                  <p>Opdateret: {formatDate(question.updated_at)}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {editingQuestion === question.id ? (
                  <>
                    <MinecraftButton
                      onClick={() => handleSave(question.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      ðŸ’¾ Gem
                    </MinecraftButton>
                    <MinecraftButton
                      onClick={() => setEditingQuestion(null)}
                      className="bg-gray-600 hover:bg-gray-700"
                    >
                      âŒ Annuller
                    </MinecraftButton>
                  </>
                ) : (
                  <>
                    <MinecraftButton
                      onClick={() => handleEdit(question)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      âœï¸ Rediger
                    </MinecraftButton>
                    
                    {!question.is_published ? (
                      <MinecraftButton
                        onClick={() => handlePublish(question.id)}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={!question.answer_text}
                      >
                        ðŸ“¢ Publicer
                      </MinecraftButton>
                    ) : (
                      <MinecraftButton
                        onClick={() => handleUnpublish(question.id)}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        ðŸ”’ Afpublicer
                      </MinecraftButton>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </MinecraftCard>
  )
}

