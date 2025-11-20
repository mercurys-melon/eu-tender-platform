'use client'

import { useState } from 'react'

interface Bid {
  id: string
  amount: number
  status: 'pending' | 'accepted' | 'rejected'
  submittedAt: string
  company: string
}

interface BidSectionProps {
  tenderId: string
  currentBids: Bid[]
}

export default function BidSection({ tenderId, currentBids }: BidSectionProps) {
  const [bidAmount, setBidAmount] = useState('')
  const [bidDescription, setBidDescription] = useState('')

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    accepted: 'bg-green-100 text-green-800 border-green-300',
    rejected: 'bg-red-100 text-red-800 border-red-300'
  }

  const handleSubmitBid = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle bid submission
    console.log('Submitting bid:', { bidAmount, bidDescription })
  }

  const totalBids = currentBids.length
  const averageBid = totalBids > 0 
    ? currentBids.reduce((sum, bid) => sum + bid.amount, 0) / totalBids 
    : 0
  const lowestBid = totalBids > 0 
    ? Math.min(...currentBids.map(bid => bid.amount)) 
    : 0

  return (
    <div className="space-y-6">
      {/* Bid Statistics */}
      <div className="card p-6">
        <h2 className="text-h2 mb-4">
          📊 Budstatistik
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-poppins font-semibold text-granite-grey">
              {totalBids}
            </div>
            <div className="text-small text-slate-grey">
              Antal bud
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-poppins font-semibold text-emerald-green">
              {averageBid.toLocaleString('da-DK')} kr
            </div>
            <div className="text-small text-slate-grey">
              Gennemsnit
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-poppins font-semibold text-nordic-blue">
              {lowestBid.toLocaleString('da-DK')} kr
            </div>
            <div className="text-small text-slate-grey">
              Laveste bud
            </div>
          </div>
        </div>
      </div>

      {/* Current Bids */}
      <div className="card p-6">
        <h3 className="text-h3 mb-4">
          📋 Nuværende bud
        </h3>
        <div className="space-y-3">
          {currentBids.map((bid) => (
            <div key={bid.id} className="flex items-center justify-between p-4 border border-silver-mist rounded-lg">
              <div className="flex-1">
                <div className="font-inter font-semibold text-lg text-granite-grey">
                  {bid.amount.toLocaleString('da-DK')} kr
                </div>
                <div className="text-small text-slate-grey">
                  {bid.company} • {new Date(bid.submittedAt).toLocaleDateString('da-DK')}
                </div>
              </div>
              <span className={`badge ${statusColors[bid.status]}`}>
                {bid.status === 'pending' ? 'Afventer' : bid.status === 'accepted' ? 'Accepteret' : 'Afvist'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Bid Form */}
      <div className="card p-6">
        <h3 className="text-h3 mb-4">
          💰 Indsend bud
        </h3>
        <p className="text-slate-grey mb-4">
          Udfyld nedenstående felter for at indsende dit bud på dette udbud.
        </p>
        <form onSubmit={handleSubmitBid} className="space-y-4">
          <div>
            <label htmlFor="bidAmount" className="label block mb-2">
              Budbeløb (DKK)
            </label>
            <input
              id="bidAmount"
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="input"
              placeholder="Indtast beløb"
              required
            />
          </div>
          <div>
            <label htmlFor="bidDescription" className="label block mb-2">
              Beskrivelse
            </label>
            <textarea
              id="bidDescription"
              value={bidDescription}
              onChange={(e) => setBidDescription(e.target.value)}
              className="input resize-none"
              rows={4}
              placeholder="Beskriv dit bud og tilgang til projektet..."
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            Indsend bud
          </button>
        </form>
      </div>
    </div>
  )
} 