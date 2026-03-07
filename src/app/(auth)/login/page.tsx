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
      const { data, error } = await supabase().auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }

      if (!data.user) {
        setError('Login fejlede. Prøv igen.')
        setIsLoading(false)
        return
      }

      // Get user profile to check role - use data.user directly
      const { data: profile, error: profileError } = await supabase()
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()
      
      if (profileError) {
        console.error('Error fetching profile:', profileError)
      }
      
      // Read dbRole from profile
      const dbRole = profile?.role as UserRole | undefined
      
      // Read preferredRole from state variable or localStorage
      const preferredRole = role || (localStorage.getItem('preferred_role') as UserRole | null)
      
      // Set finalRole with fallback chain
      const finalRole: UserRole = dbRole ?? preferredRole ?? 'supplier'
      
      // If dbRole is falsy, upsert the profile with finalRole
      if (!dbRole) {
        const { error: upsertError } = await supabase()
          .from('profiles')
          .upsert({ id: data.user.id, role: finalRole }, { onConflict: 'id' })
        
        if (upsertError) {
          console.error('Error upserting profile:', upsertError)
        }
      }
      
      // Wait a moment for cookies to be set by SSR client
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Reset loading state before redirect
      setIsLoading(false)
      
      // Handle redirectTo query parameter
      const redirectTo = searchParams.get('redirectTo')
      const defaultTarget = finalRole === 'buyer' ? '/buyer' : '/supplier'
      
      let target = defaultTarget
      
      // If redirectTo is provided and matches the user's role, use it
      if (redirectTo) {
        if (redirectTo.startsWith('/buyer') && finalRole === 'buyer') {
          target = redirectTo
        } else if (redirectTo.startsWith('/supplier') && finalRole === 'supplier') {
          target = redirectTo
        }
      }
      
      // Use router.push - SSR client should have synced session to cookies
      router.push(target)
      router.refresh() // Force a refresh to ensure server components see the new session
    } catch (err) {
      console.error('Login error:', err)
      setError('Der opstod en uventet fejl. Prøv igen.')
      setIsLoading(false)
    }
  }

  return (
    <section className="w-full max-w-md">
      <div className="card p-6 md:p-8">
        <h1 className="text-h3 text-center mb-2">BlockBid</h1>
        <p className="text-center text-slate-grey mb-6">Log ind på din konto</p>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
          <div>
            <label className="label">Email</label>
            <input 
              type="email" 
              className="input" 
              placeholder="din@email.dk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="auth-login-email"
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
              data-testid="auth-login-password"
            />
            <div className="text-right mt-1">
              <Link href="/reset-password" className="text-sm text-nordic-blue hover:text-emerald-green transition-colors">
                Glemt adgangskode?
              </Link>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3" data-testid="auth-login-error">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary w-full"
            disabled={isLoading}
            data-testid="auth-login-submit"
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