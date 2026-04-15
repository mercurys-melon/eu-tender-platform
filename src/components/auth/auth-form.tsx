'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { BlockBidButton } from '@/components/ui/blockbid-button'
import { BlockBidInput } from '@/components/ui/blockbid-input'
import { BlockBidCard } from '@/components/ui/blockbid-card'

interface AuthFormProps {
  mode: 'login' | 'register'
}

export function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'login') {
        const { error } = await supabase().auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/tenders')
      } else {
        const { error } = await supabase().auth.signUp({
          email,
          password,
        })
        if (error) throw error
        // For registrering, vi kan enten redirect til login eller vise en besked
        alert('Tjek din email for bekræftelse!')
        router.push('/login')
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <BlockBidCard variant="hover" className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-h2 mb-2" style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>
          BlockBid
        </h1>
        <p className="text-granite-grey" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
          {mode === 'login' ? 'Log ind på din konto' : 'Opret ny konto'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" data-testid={`${mode}-form`}>
        <BlockBidInput
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="din@email.dk"
          required
          data-testid={`${mode}-email`}
        />

        <BlockBidInput
          label="Adgangskode"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          data-testid={`${mode}-password`}
        />

        {error && (
          <div className="text-sm text-sunset-orange bg-sunset-orange/10 p-3 rounded-full border border-sunset-orange/30" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }} data-testid={`${mode}-error`}>
            {error}
          </div>
        )}

        <BlockBidButton
          type="submit"
          className="w-full"
          disabled={loading}
          data-testid={`${mode}-submit`}
        >
          {loading ? 'Indlæser...' : mode === 'login' ? 'Log Ind' : 'Opret Konto'}
        </BlockBidButton>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-granite-grey" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
          {mode === 'login' ? 'Har du ikke en konto?' : 'Har du allerede en konto?'}
          <a
            href={mode === 'login' ? '/register' : '/login'}
            className="text-xp-sky-blue hover:text-digital-navy ml-1 underline"
          >
            {mode === 'login' ? 'Opret konto' : 'Log ind'}
          </a>
        </p>
      </div>
    </BlockBidCard>
  )
} 