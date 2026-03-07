'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { BlockBidCard } from '@/components/ui/blockbid-card'
import { BlockBidButton } from '@/components/ui/blockbid-button'
import { BlockBidInput } from '@/components/ui/blockbid-input'

interface FormData {
  title: string
  description: string
  entity_id: string
  category: string
  estimated_value: string
  currency: string
  submission_deadline: string
  publication_date: string
  espd_required: boolean
  ted_published: boolean
}

interface FormErrors {
  title?: string
  description?: string
  entity_id?: string
  category?: string
  estimated_value?: string
  submission_deadline?: string
  publication_date?: string
  general?: string
}

const categories = [
  'Byggeri og anlæg',
  'IT og software',
  'Konsulentydelser',
  'Vareleverancer',
  'Transport og logistik',
  'Rengøring og vedligeholdelse',
  'Sundhed og omsorg',
  'Uddannelse og træning',
  'Andet'
]

const currencies = ['DKK', 'EUR', 'USD', 'SEK', 'NOK']

export function CreateTenderForm() {
  const { user } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    entity_id: '',
    category: '',
    estimated_value: '',
    currency: 'DKK',
    submission_deadline: '',
    publication_date: '',
    espd_required: false,
    ted_published: false
  })

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Titel er påkrævet'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Beskrivelse er påkrævet'
    }

    if (!formData.entity_id.trim()) {
      newErrors.entity_id = 'Enhed er påkrævet'
    }

    if (!formData.category) {
      newErrors.category = 'Kategori er påkrævet'
    }

    if (!formData.estimated_value || parseFloat(formData.estimated_value) <= 0) {
      newErrors.estimated_value = 'Gyldigt beløb er påkrævet'
    }

    if (!formData.submission_deadline) {
      newErrors.submission_deadline = 'Deadline er påkrævet'
    }

    if (!formData.publication_date) {
      newErrors.publication_date = 'Publiceringsdato er påkrævet'
    }

    // Check if dates are valid
    if (formData.submission_deadline && formData.publication_date) {
      const publicationDate = new Date(formData.publication_date)
      const submissionDate = new Date(formData.submission_deadline)
      
      if (submissionDate <= publicationDate) {
        newErrors.submission_deadline = 'Deadline skal være efter publiceringsdato'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    if (!user) {
      setErrors({ general: 'Du skal være logget ind for at oprette et udbud' })
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const tenderData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        entity_id: formData.entity_id.trim(),
        category: formData.category,
        estimated_value: parseFloat(formData.estimated_value),
        currency: formData.currency,
        submission_deadline: formData.submission_deadline,
        publication_date: formData.publication_date,
        status: 'published' as const,
        espd_required: formData.espd_required,
        ted_published: formData.ted_published
      }

      console.log('Creating tender with data:', tenderData)

      const { data, error } = await supabase()
        .from('tenders')
        .insert([tenderData])
        .select()

      if (error) {
        console.error('Error creating tender:', error)
        setErrors({ general: `Der opstod en fejl ved oprettelse af udbud: ${error.message}` })
      } else {
        console.log('Tender created successfully:', data)
        setSuccess(true)
        // Redirect efter 2 sekunder
        setTimeout(() => {
          router.push('/tenders')
        }, 2000)
      }
    } catch (error) {
      console.error('Error creating tender:', error)
      setErrors({ general: 'Der opstod en uventet fejl. Prøv igen.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <BlockBidCard variant="hover">
          <div className="text-center">
            <h1 className="text-h2 mb-4 text-hint-green" style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>
              ✅ Udbud Oprettet!
            </h1>
            <p className="text-granite-grey mb-6" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
              Dit udbud er blevet oprettet og publiceret succesfuldt.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/tenders">
                <BlockBidButton>
                  Se Alle Udbud
                </BlockBidButton>
              </Link>
              <BlockBidButton 
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Opret Nyt Udbud
              </BlockBidButton>
            </div>
          </div>
        </BlockBidCard>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link href="/tenders">
            <BlockBidButton variant="outline" size="sm">
              ← Tilbage til Udbud
            </BlockBidButton>
          </Link>
        </div>
        
        <h1 className="font-minecraft text-4xl md:text-5xl font-bold text-white mb-2">
          Opret Nyt Udbud
        </h1>
        <p className="font-minecraft text-gray-300 text-lg">
          Udfyld formularen nedenfor for at oprette et nyt udbud
        </p>
      </div>

      {/* Form */}
      <BlockBidCard variant="hover">
        <form onSubmit={handleSubmit} className="space-y-6" data-testid="tender-create-form">
          {/* General Error */}
          {errors.general && (
            <div className="font-minecraft p-4 bg-red-100 border-2 border-red-500 text-red-700">
              {errors.general}
            </div>
          )}

          {/* Title and Description */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <BlockBidInput
                label="Titel *"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Indtast udbuds titel"
                error={errors.title}
                data-testid="tender-create-title"
              />
            </div>
            
            <div>
              <BlockBidInput
                label="Enhed *"
                value={formData.entity_id}
                onChange={(e) => handleInputChange('entity_id', e.target.value)}
                placeholder="F.eks. Københavns Kommune"
                error={errors.entity_id}
                data-testid="tender-entity"
              />
            </div>
          </div>

          <div>
            <label className="font-minecraft block text-sm font-medium text-gray-700 mb-2">
              Beskrivelse *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Beskriv udbuddet i detaljer..."
              rows={6}
              className={`w-full px-4 py-3 border-4 font-minecraft ${
                errors.description 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-600 bg-gray-100'
              } text-gray-900`}
              data-testid="tender-create-description"
            />
            {errors.description && (
              <p className="font-minecraft text-red-600 text-sm mt-1">
                {errors.description}
              </p>
            )}
          </div>

          {/* Category and Value */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <label className="font-minecraft block text-sm font-medium text-gray-700 mb-2">
                Kategori *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className={`w-full px-4 py-3 border-4 font-minecraft ${
                  errors.category 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-600 bg-gray-100'
                } text-gray-900`}
                data-testid="tender-create-category"
              >
                <option value="">Vælg kategori</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="font-minecraft text-red-600 text-sm mt-1">
                  {errors.category}
                </p>
              )}
            </div>

            <div>
              <BlockBidInput
                label="Estimeret Værdi *"
                type="number"
                value={formData.estimated_value}
                onChange={(e) => handleInputChange('estimated_value', e.target.value)}
                placeholder="100000"
                error={errors.estimated_value}
                data-testid="tender-create-estimated-value"
              />
            </div>

            <div>
              <label className="font-minecraft block text-sm font-medium text-gray-700 mb-2">
                Valuta
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="w-full px-4 py-3 border-4 border-gray-600 bg-gray-100 font-minecraft text-gray-900"
              >
                {currencies.map(currency => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <BlockBidInput
                label="Publiceringsdato *"
                type="date"
                value={formData.publication_date}
                onChange={(e) => handleInputChange('publication_date', e.target.value)}
                error={errors.publication_date}
              />
            </div>

            <div>
              <BlockBidInput
                label="Deadline *"
                type="date"
                value={formData.submission_deadline}
                onChange={(e) => handleInputChange('submission_deadline', e.target.value)}
                error={errors.submission_deadline}
                data-testid="tender-create-submission-deadline"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="espd_required"
                checked={formData.espd_required}
                onChange={(e) => handleInputChange('espd_required', e.target.checked)}
                className="w-4 h-4 border-2 border-gray-600 bg-gray-100"
              />
              <label htmlFor="espd_required" className="font-minecraft ml-2 text-gray-700">
                ESPD påkrævet
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="ted_published"
                checked={formData.ted_published}
                onChange={(e) => handleInputChange('ted_published', e.target.checked)}
                className="w-4 h-4 border-2 border-gray-600 bg-gray-100"
              />
              <label htmlFor="ted_published" className="font-minecraft ml-2 text-gray-700">
                TED publiceret
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-6">
            <BlockBidButton 
              type="submit" 
              size="lg"
              disabled={isSubmitting}
              className="min-w-[200px]"
              aria-label={isSubmitting ? 'Opretter udbud...' : 'Opret nyt udbud'}
              data-testid="tender-create-submit"
            >
              {isSubmitting ? '🔄 Opretter...' : '📝 Opret Udbud'}
            </BlockBidButton>
          </div>
        </form>
        </BlockBidCard>
    </div>
  )
} 