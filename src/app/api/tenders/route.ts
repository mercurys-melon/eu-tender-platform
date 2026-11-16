import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, getServiceClient } from '@/lib/supabase/server'
import { json, badRequest, unauthorized, internal } from '@/lib/http'
import { logAction } from '@/lib/audit'
import { getBuyerOrganisationId } from '@/lib/authz'

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
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return unauthorized()

    // Ordregiver = medlem (owner/admin/editor) af en organisation.
    // profiles.role er 'buyer' for alle nye brugere og kan derfor ikke bruges som autorisation.
    const organisationId = await getBuyerOrganisationId(user.id)
    if (!organisationId) {
      return json(
        { error: 'Din bruger er ikke tilknyttet en ordregiver-organisation. Kontakt support.' },
        403,
      )
    }

    const body = await request.json().catch(() => null)
    const result = createTenderSchema.safeParse(body)
    if (!result.success) {
      return badRequest(result.error.issues[0]?.message ?? 'Ugyldige data')
    }

    const data = result.data
    const deadline = new Date(data.submission_deadline)
    if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now()) {
      return badRequest('Tilbudsfristen skal være en gyldig dato i fremtiden')
    }

    // Service role omgår RLS — auth + organisations-medlemskab er verificeret ovenfor.
    // organisation_id er påkrævet for at bids-RLS (deadline-gated læseadgang) virker.
    const db = getServiceClient()

    const { data: tender, error } = await db
      .from('tenders')
      .insert({
        title: data.title,
        description: data.description,
        entity_id: user.id,
        organisation_id: organisationId,
        created_by: user.id,
        submission_deadline: deadline.toISOString(),
        estimated_value: data.estimated_value ?? 0,
        category: data.category ?? '',
        currency: data.currency,
        status: 'draft',
        // publication_date er NOT NULL i skemaet; overskrives ved faktisk publicering.
        publication_date: new Date().toISOString(),
      })
      .select('id, title, status, created_at')
      .single()

    if (error) {
      console.error('[POST /api/tenders] DB error:', error.code, error.message)
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
