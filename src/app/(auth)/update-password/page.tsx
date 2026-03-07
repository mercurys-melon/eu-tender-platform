'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function UpdatePassword() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  // Check if user has a valid session for password recovery
  useEffect(() => {
    const ensureSession = async () => {
      try {
        // Session should already be set by the callback route on server-side
        // Just check if we have a valid session
        const { data, error } = await supabase().auth.getSession()
        if (error) throw error
        
        // Check if user has a valid session
        if (!data.session) {
          setErr('Ugyldigt eller udløbet link. Prøv at sende et nyt.')
        } else {
          // Verify the user is authenticated
          const { data: { user } } = await supabase().auth.getUser()
          if (!user || user.aud !== 'authenticated') {
            setErr('Ugyldig session. Prøv at sende et nyt link.')
          }
        }
      } catch (e: any) {
        console.error('Update password error:', e)
        setErr(e.message || 'Der opstod en fejl. Prøv at sende et nyt link.')
      } finally {
        setChecking(false)
      }
    }
    ensureSession()
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null); setOk(null)
    
    if (pw.length < 6) {
      setErr('Adgangskoden skal være mindst 6 tegn')
      return
    }
    
    const { error } = await supabase().auth.updateUser({ password: pw })
    if (error) setErr(error.message)
    else {
      setOk('Adgangskode opdateret. Logger ind…')
      setTimeout(() => router.push('/tenders'), 1000)
    }
  }

  if (checking) return (
    <section className="w-full max-w-md">
      <div className="card p-6 md:p-8 text-center">
        <p>Validerer link…</p>
      </div>
    </section>
  )

  return (
    <section className="w-full max-w-md">
      <div className="card p-6 md:p-8">
        <h1 className="text-h3 text-center mb-2">🔒 Ny adgangskode</h1>
        {err ? (
          <div className="text-center mb-4">
            <p className="text-red-600 mb-2">{err}</p>
            <a 
              href="/reset-password" 
              className="link"
            >
              Anmod om nyt link
            </a>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">Ny adgangskode</label>
              <input
                type="password"
                className="input"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                minLength={6}
                required
              />
              <p className="text-slate-grey text-xs mt-1">Minimum 6 tegn</p>
            </div>
            {ok && <p className="text-green-600 text-center">{ok}</p>}
            <button type="submit" className="btn-primary w-full">
              Opdater adgangskode
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
