'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type BidFormProps = {
  tenderId: string
  onSuccess?: () => void
}

/**
 * BidForm
 * - Henter den loggede bruger via Supabase Auth
 * - Indsender bud til 'bids' tabellen
 * - Bruger user.id som midlertidig 'supplier_id' (indtil der er en rigtig supplier-profil)
 */
export default function BidForm({ tenderId, onSuccess }: BidFormProps) {
  const [amount, setAmount] = useState<number | ''>('')
  const [currency, setCurrency] = useState('DKK')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        setError(error.message)
        return
      }
      setUserId(data.user?.id ?? null)
    }
    getUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!userId) {
      setError('Du skal være logget ind for at afgive bud.')
      return
    }
    if (amount === '' || Number.isNaN(Number(amount))) {
      setError('Angiv et gyldigt beløb.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('bids').insert({
        tender_id: tenderId,
        supplier_id: userId, // midlertidigt: brug user.id som supplier_id
        amount: Number(amount),
        currency,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })

      if (error) throw error
      setAmount('')
      setCurrency('DKK')
      if (onSuccess) onSuccess()
      alert('✅ Dit bud er indsendt!')
    } catch (err: any) {
      setError(err.message ?? 'Kunne ikke indsende bud.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h2 className="text-h3 mb-4">💰 Afgiv bud</h2>

      {!userId ? (
        <p className="text-small text-deep-orange">
          Du er ikke logget ind. <a className="underline" href="/login">Log ind</a> for at afgive bud.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="amount" className="label">Beløb</label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="input"
              required
            />
          </div>

          <div>
            <label htmlFor="currency" className="label">Valuta</label>
            <input
              id="currency"
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="input"
              required
            />
          </div>

          {error && (
            <div className="text-small text-deep-orange bg-deep-orange/10 p-3 border border-deep-orange/20">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Indsender...' : 'Indsend bud'}
          </button>
        </form>
      )}
    </div>
  )
}
