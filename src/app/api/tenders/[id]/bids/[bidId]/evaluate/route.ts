import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, assertTenderOwner } from '@/lib/authz'
import { z } from 'zod'
import { json, badRequest, unauthorized, internal, notFound } from '@/lib/http'
import type { Database } from '@/lib/supabase/types'

export const runtime = 'nodejs'

type BidsUpdate = Database['public']['Tables']['bids']['Update']
type TendersUpdate = Database['public']['Tables']['tenders']['Update']

const evaluationSchema = z.object({
  status: z.enum(['submitted', 'under_review', 'accepted', 'rejected', 'under_evaluation', 'winner', 'not_awarded']).optional(),
  evaluation_notes: z.string().max(2000).optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; bidId: string } }
) {
  try {
    const supabase = createClient()
    const user = await getCurrentUser()
    
    if (!user) {
      return unauthorized()
    }

    // Check if user is tender owner (buyer)
    const isOwner = await assertTenderOwner(user.id, params.id)
    if (!isOwner) {
      return json(
        { error: 'Du har ikke tilladelse til at evaluere bud på dette udbud' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = evaluationSchema.parse(body)

    // Get current bid
    const { data: currentBid, error: bidError } = await supabase
      .from('bids')
      .select('*, tender_id')
      .eq('id', params.bidId)
      .eq('tender_id', params.id)
      .single()

    if (bidError || !currentBid) {
      return notFound('Bud ikke fundet')
    }

    // Get current tender to check evaluation_started_at
    const { data: tender, error: tenderError } = await supabase
      .from('tenders')
      .select('evaluation_started_at, awarded_bid_id')
      .eq('id', params.id)
      .single()

    if (tenderError || !tender) {
      return notFound('Udbud ikke fundet')
    }

    // Prepare update data
    const bidUpdateData: any = {}
    const tenderUpdateData: any = {}

    // Update bid status if provided
    if (validatedData.status !== undefined) {
      bidUpdateData.status = validatedData.status

      // If setting to winner, handle single winner logic
      if (validatedData.status === 'winner') {
        // Set all other bids for this tender to 'not_awarded' (if they are submitted or under_evaluation)
        await supabase
          .from('bids')
          .update<BidsUpdate>({ status: 'not_awarded' })
          .eq('tender_id', params.id)
          .neq('id', params.bidId)
          .in('status', ['submitted', 'under_evaluation', 'under_review'])

        // Update tender with awarded_bid_id
        tenderUpdateData.awarded_bid_id = params.bidId

        // Set evaluation_completed_at if not already set
        if (!tender.evaluation_completed_at) {
          tenderUpdateData.evaluation_completed_at = new Date().toISOString()
        }
      } else if (validatedData.status !== 'winner' && tender.awarded_bid_id === params.bidId) {
        // If removing winner status, clear awarded_bid_id
        tenderUpdateData.awarded_bid_id = null
        tenderUpdateData.evaluation_completed_at = null
      }

      // Set evaluation_started_at if not already set (first time evaluating)
      if (!tender.evaluation_started_at) {
        tenderUpdateData.evaluation_started_at = new Date().toISOString()
      }
    }

    // Update evaluation_notes if provided
    if (validatedData.evaluation_notes !== undefined) {
      bidUpdateData.evaluation_notes = validatedData.evaluation_notes || null
    }

    // Update bid
    if (Object.keys(bidUpdateData).length > 0) {
      const { data: updatedBid, error: updateError } = await supabase
        .from('bids')
        .update<BidsUpdate>(bidUpdateData)
        .eq('id', params.bidId)
        .eq('tender_id', params.id)
        .select('*')
        .single<Database['public']['Tables']['bids']['Row']>()

      if (updateError) {
        console.error('Error updating bid:', updateError)
        return internal('Kunne ikke opdatere bud')
      }

      // Update tender if needed
      if (Object.keys(tenderUpdateData).length > 0) {
        const { error: tenderUpdateError } = await supabase
          .from('tenders')
          .update<TendersUpdate>(tenderUpdateData)
          .eq('id', params.id)

        if (tenderUpdateError) {
          console.error('Error updating tender:', tenderUpdateError)
          return internal('Kunne ikke opdatere udbud')
        }
      }

      return json({
        ok: true,
        bid: {
          id: updatedBid.id,
          status: updatedBid.status,
          evaluation_notes: updatedBid.evaluation_notes,
          updated_at: updatedBid.updated_at,
        }
      })
    }

    return badRequest('Ingen opdateringer angivet')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest('Ugyldig data')
    }

    console.error('Error in PATCH /evaluate:', error)
    return internal('Intern server fejl')
  }
}

