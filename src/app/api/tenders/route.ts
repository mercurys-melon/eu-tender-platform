import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, getServiceClient } from '@/lib/supabase/server'
import { json, badRequest, unauthorized, internal } from '@/lib/http'
import { logAction } from '@/lib/audit'

export const runtime = 'nodejs'

const createTenderSchema = z.object({
  title: z.string().min(3, 'Titel skal være mindst 3 tegn').max(200, 'Titel må højst være 200 tegn'),
  description: z.string().min(10, 'Beskrivelse skal være mindst 10 tegn'),
  submission_deadline: z.string().min(1, 'Deadline er påkrævet'),
  estimated_value: z.number().positive('Værdi skal være positiv').optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  currency: z.string().length(3).default('DKK'),
})

// Fallback OPTIONS handler — middleware handles the common case, this catches edge cases
export function OPTIONS() {
  return new NextResponse(null, { status: 200 })
}

export async function POST(request: NextRequest) {
  try {
    // Single client instance for the entire request — avoids multiple cookie reads
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return unauthorized()

    // Verify buyer role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'buyer') {
      return json({ error: 'Kun indkøbere kan oprette udbud' }, 403)
    }

    const body = await request.json()
    console.log('[POST /api/tenders] body:', JSON.stringify(body))
    const result = createTenderSchema.safeParse(body)
    if (!result.success) {
      console.log('[POST /api/tenders] Zod errors:', JSON.stringify(result.error.issues))
      return badRequest(result.error.issues[0]?.message ?? 'Ugyldige data')
    }

    const data = result.data

    // Use service role to bypass RLS — auth + buyer-role already verified above
    const db = getServiceClient()

    const { data: tender, error } = await db
      .from('tenders')
      .insert({
        title: data.title,
        description: data.description,
        entity_id: user.id,
        submission_deadline: data.submission_deadline,
        estimated_value: data.estimated_value ?? 0,
        category: data.category ?? '',
        currency: data.currency,
        status: 'draft',
        publication_date: new Date().toISOString(),
      })
      .select('id, title, status, created_at')
      .single()

    if (error) {
      console.error('[POST /api/tenders] DB error:', JSON.stringify(error))
      return internal('Kunne ikke oprette udbud. Prøv igen.')
    }

    await logAction(user.id, 'tender.created', 'tender', tender.id, { title: tender.title })

    return json(
      { id: tender.id, title: tender.title, status: tender.status, created_at: tender.created_at },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? 'Ugyldige data')
    }
    console.error('Error in POST /api/tenders:', error)
    return internal('Intern server fejl')
  }
}
