'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { roleFromQuery, type UserRole } from '@/lib/roles'

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialRole = roleFromQuery(searchParams.get('role')) ?? 'supplier'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password.length < 6) {
      setError('Adgangskoden skal være mindst 6 tegn')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Adgangskoderne matcher ikke')
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase().auth.signUp({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else if (data.user) {
        const userId = data.user.id
        if (userId) {
          await (supabase() as any)
            .from('profiles')
            .upsert({ id: userId, role: initialRole }, { onConflict: 'id' })

          localStorage.setItem('preferred_role', initialRole)
          router.replace(initialRole === 'buyer' ? '/buyer' : '/supplier')
        }
      }
    } catch (err) {
      setError('Der opstod en uventet fejl. Prøv igen.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="w-full max-w-md">
      <div className="card p-6 md:p-8">
        <h1 className="text-h3 text-center mb-2">Mercurry Tender</h1>
        <p className="text-center text-slate-grey mb-6">Opret ny konto</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

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
          <div>
            <label className="label">Adgangskode</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            <p className="text-slate-grey text-xs mt-1">Minimum 6 tegn</p>
          </div>
          <div>
            <label className="label">Bekræft adgangskode</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Opretter konto...' : 'Opret konto'}
          </button>
        </form>

        <p className="text-small text-center mt-4">
          Har du allerede en konto?{' '}
          <Link href="/login" className="link">Log ind</Link>
        </p>
      </div>
    </section>
  )
}
