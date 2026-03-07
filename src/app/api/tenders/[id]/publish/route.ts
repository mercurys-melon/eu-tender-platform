/**
 * API Route for publishing tenders to udbud.dk
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import { publishToUdbud } from '@/lib/publication/service'

/**
 * POST /api/tenders/[id]/publish
 * Publishes a tender to udbud.dk
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
    }

    // Verify user owns the tender
    const { data: tender, error: tenderError } = await supabase
      .from('tenders')
      .select('entity_id')
      .eq('id', params.id)
      .single()

    if (tenderError || !tender) {
      return NextResponse.json({ error: 'Tender ikke fundet' }, { status: 404 })
    }

    if (tender.entity_id !== user.id) {
      return NextResponse.json(
        { error: 'Du har ikke tilladelse til at publicere denne tender' },
        { status: 403 }
      )
    }

    // Publish to udbud.dk
    const result = await publishToUdbud(params.id)

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          jobId: result.jobId,
          status: result.status,
          message: result.message,
          requestId: result.requestId,
        },
        { status: 200 }
      )
    } else {
      // Return validation/field errors in a structured way
      return NextResponse.json(
        {
          success: false,
          jobId: result.jobId,
          status: result.status,
          message: result.message,
          errors: result.errors,
          requestId: result.requestId,
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error in POST /api/tenders/[id]/publish:', error)
    return NextResponse.json(
      { error: 'Intern server fejl', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/tenders/[id]/publish
 * Get publication status for a tender
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
    }

    // Verify user owns the tender
    const { data: tender, error: tenderError } = await supabase
      .from('tenders')
      .select('entity_id')
      .eq('id', params.id)
      .single()

    if (tenderError || !tender) {
      return NextResponse.json({ error: 'Tender ikke fundet' }, { status: 404 })
    }

    if (tender.entity_id !== user.id) {
      return NextResponse.json(
        { error: 'Du har ikke tilladelse til at se publikationsstatus' },
        { status: 403 }
      )
    }

    // Get publication jobs
    const { getTenderPublicationJobs } = await import('@/lib/publication/service')
    const jobs = await getTenderPublicationJobs(params.id)

    return NextResponse.json({ jobs }, { status: 200 })
  } catch (error: any) {
    console.error('Error in GET /api/tenders/[id]/publish:', error)
    return NextResponse.json(
      { error: 'Intern server fejl', message: error.message },
      { status: 500 }
    )
  }
}
