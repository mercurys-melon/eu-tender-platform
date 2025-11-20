'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { roleFromQuery, type UserRole } from '@/lib/roles'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole | null>(roleFromQuery(searchParams.get('role')))

  useEffect(() => {
    if (role) {
      localStorage.setItem('preferred_role', role)
    }
  }, [role])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else if (data.user) {
        // Get user profile to check role
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user?.id)
          .maybeSingle()
        
        const dbRole = profile?.role as UserRole | undefined
        const finalRole = dbRole ?? (localStorage.getItem('preferred_role') as UserRole | null) ?? 'supplier'
        
        // Redirect based on role
        router.replace(finalRole === 'buyer' ? '/buyer' : '/supplier')
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
        <h1 className="text-h3 text-center mb-2">BlockBid</h1>
        <p className="text-center text-slate-grey mb-6">Log ind på din konto</p>

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
            <label className="text-sm font-medium text-granite-grey mb-2 block">Adgangskode</label>
            <input 
              type="password" 
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="text-right mt-1">
              <Link href="/reset-password" className="text-sm text-nordic-blue hover:text-emerald-green transition-colors">
                Glemt adgangskode?
              </Link>
            </div>
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
            {isLoading ? 'Logger ind...' : 'Log ind'}
          </button>
        </form>

        <p className="text-small text-center mt-4">
          Har du ikke en konto? <Link href="/register" className="link">Opret konto</Link>
        </p>
      </div>
    </section>
  )
} 