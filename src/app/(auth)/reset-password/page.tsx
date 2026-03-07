'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check for error parameters from URL (e.g., from callback redirect)
  useEffect(() => {
    const urlError = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    if (urlError) {
      setError(errorDescription || urlError)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Check if Supabase is configured
      // In Next.js, NEXT_PUBLIC_* vars are available at build time
      // If they're empty, the client will use placeholder values
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      // Check if environment variables are missing or are placeholder values
      if (!supabaseUrl || !supabaseKey || 
          supabaseUrl.trim() === '' || supabaseKey.trim() === '' ||
          supabaseUrl === 'https://placeholder.supabase.co' ||
          supabaseKey === 'placeholder-anon-key') {
        setError(
          '⚠️ Supabase er ikke konfigureret. ' +
          'Udfyld NEXT_PUBLIC_SUPABASE_URL og NEXT_PUBLIC_SUPABASE_ANON_KEY i .env.local filen og genstart serveren. ' +
          'Se setup.md for instruktioner.'
        )
        setIsLoading(false)
        return
      }

      const { error, data } = await supabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      })

      if (error) {
        // Check if it's a configuration issue
        if (error.message?.includes('fetch') || 
            error.message === 'Failed to fetch' ||
            error.message?.toLowerCase().includes('network') ||
            error.message?.toLowerCase().includes('connection')) {
          setError(
            'Kunne ikke oprette forbindelse til Supabase. ' +
            'Tjek at NEXT_PUBLIC_SUPABASE_URL og NEXT_PUBLIC_SUPABASE_ANON_KEY er korrekt sat i .env.local, ' +
            'og at du har genstartet udviklingsserveren efter at have opdateret filen.'
          )
        } else {
          setError(error.message)
        }
      } else {
        setIsSubmitted(true)
      }
    } catch (err: any) {
      // Handle network errors and other exceptions
      const errorMessage = err?.message || err?.toString() || ''
      
      if (errorMessage.includes('fetch') || 
          errorMessage === 'Failed to fetch' ||
          errorMessage.toLowerCase().includes('network') ||
          errorMessage.toLowerCase().includes('connection') ||
          errorMessage.toLowerCase().includes('cors')) {
        setError(
          'Kunne ikke oprette forbindelse til Supabase. ' +
          'Tjek at NEXT_PUBLIC_SUPABASE_URL og NEXT_PUBLIC_SUPABASE_ANON_KEY er korrekt sat i .env.local, ' +
          'og at du har genstartet udviklingsserveren efter at have opdateret filen.'
        )
      } else if (errorMessage) {
        setError(errorMessage)
      } else {
        setError('Der opstod en uventet fejl. Prøv igen.')
      }
      console.error('Reset password error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <section className="w-full max-w-md">
        <div className="card p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-emerald-green/10 grid place-items-center">
              <span className="text-emerald-green text-xl">✅</span>
            </div>
            <h1 className="text-h3 mb-1">Email sendt!</h1>
            <p className="text-slate-grey text-sm">
              Hvis {email} findes i vores system, har vi sendt et link til at nulstille din adgangskode.
            </p>
          </div>

          <div className="bg-emerald-green/5 border border-emerald-green/20 rounded-lg p-4 mb-6">
            <p className="text-emerald-green text-sm text-center">
              Tjek din email og spam-mappe. Linket udløber om 1 time.
            </p>
          </div>

          <div className="text-center space-y-3">
            <button 
              onClick={() => setIsSubmitted(false)}
              className="btn-outline w-full"
            >
              Send til en anden email
            </button>
            
            <Link href="/login" className="link block">
              Tilbage til log ind
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full max-w-md">
      <div className="card p-6 md:p-8">
        <div className="text-center mb-6">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-deep-orange/10 grid place-items-center">
            <span className="text-deep-orange text-xl">🔑</span>
          </div>
          <h1 className="text-h3 mb-1">Nulstil adgangskode</h1>
          <p className="text-slate-grey text-sm">
            Indtast din email-adresse, så sender vi dig et link til at nulstille din adgangskode.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input 
              type="email" 
              className="input" 
              placeholder="din@email.dk" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary w-full" 
            disabled={isLoading}
          >
            {isLoading ? 'Sender...' : 'Send reset-link'}
          </button>
        </form>

        <p className="text-small text-center mt-4">
          <Link href="/login" className="link">Tilbage til log ind</Link>
        </p>
      </div>
    </section>
  )
}
