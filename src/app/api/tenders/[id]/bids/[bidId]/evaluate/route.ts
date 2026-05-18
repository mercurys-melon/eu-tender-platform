import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/authz'
import { z } from 'zod'
import { json, badRequest, unauthorized, internal } from '@/lib/http'
import type { Database } from '@/lib/supabase/types'

export const runtime = 'nodejs'

type BidRow = Database['public']['Tables']['bids']['Row']

// Status-whitelist matcher RPC update_bid_status() i
// migration 20260428143000_bids_consolidation.sql.
// 'submitted' og 'under_review' tillades ikke via PATCH — 'submitted' er INSERT-default,
// og evaluator-flow gaar direkte fra submitted til under_evaluation eller terminal status.
const evaluationSchema = z.object({
  status: z.enum([
    'under_evaluation',
    'accepted',
    'rejected',
    'winner',
    'not_awarded',
  ]),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; bidId: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    const body = await request.json()
    const validatedData = evaluationSchema.parse(body)

    const supabase = createClient()

    // RPC validerer:
    // - admin/owner role i bid'ets tender's organisation (SQLSTATE 42501 hvis ikke)
    // - tender deadline er passeret (SQLSTATE 22023 hvis ikke)
    // - status er i whitelist (SQLSTATE 22023 hvis ikke)
    // Returnerer den opdaterede bids-raekke.
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('update_bid_status', {
        p_bid_id: params.bidId,
        p_new_status: validatedData.status,
      })
      .single()
    const updatedBid = rpcData as BidRow | null

    if (rpcError) {
      // PostgREST exposer PostgreSQL error.code som SQLSTATE
      if (rpcError.code === '42501') {
        return json(
          { error: 'Du har ikke tilladelse til at evaluere bud paa dette udbud' },
          { status: 403 }
        )
      }
      if (rpcError.code === '22023') {
        return badRequest(rpcError.message || 'Ugyldig statusovergang')
      }
      console.error('Error in update_bid_status RPC:', rpcError)
      return internal('Kunne ikke opdatere bud')
    }

    if (!updatedBid) {
      return internal('Bud ikke fundet eller opdatering returnerede tom raekke')
    }

    return json({
      ok: true,
      bid: {
        id: updatedBid.id,
        status: updatedBid.status,
        updated_at: updatedBid.updated_at,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest('Ugyldig data')
    }
    console.error('Error in PATCH /evaluate:', error)
    return internal('Intern server fejl')
  }
}
