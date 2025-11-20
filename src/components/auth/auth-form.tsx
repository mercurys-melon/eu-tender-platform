'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { MinecraftButton } from '@/components/ui/minecraft-button'
import { MinecraftInput } from '@/components/ui/minecraft-input'
import { MinecraftCard } from '@/components/ui/minecraft-card'

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
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/tenders')
      } else {
        const { error } = await supabase.auth.signUp({
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
    <MinecraftCard className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h1 className="font-minecraft text-3xl font-bold text-gray-800 mb-2">
          BlockBid
        </h1>
        <p className="font-minecraft text-gray-600">
          {mode === 'login' ? 'Log ind på din konto' : 'Opret ny konto'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <MinecraftInput
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="din@email.dk"
          required
        />

        <MinecraftInput
          label="Adgangskode"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        {error && (
          <div className="font-minecraft text-sm text-red-600 bg-red-100 p-3 border-2 border-red-400">
            {error}
          </div>
        )}

        <MinecraftButton
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? 'Indlæser...' : mode === 'login' ? 'Log Ind' : 'Opret Konto'}
        </MinecraftButton>
      </form>

      <div className="mt-6 text-center">
        <p className="font-minecraft text-sm text-gray-600">
          {mode === 'login' ? 'Har du ikke en konto?' : 'Har du allerede en konto?'}
          <a
            href={mode === 'login' ? '/register' : '/login'}
            className="font-minecraft text-green-600 hover:text-green-700 ml-1 underline"
          >
            {mode === 'login' ? 'Opret konto' : 'Log ind'}
          </a>
        </p>
      </div>
    </MinecraftCard>
  )
} 