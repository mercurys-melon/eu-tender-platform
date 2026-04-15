import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, assertTenderOwner } from '@/lib/authz'
import { z } from 'zod'
import { json, badRequest, unauthorized, internal } from '@/lib/http'
import type { Database } from '@/lib/supabase/types'

type TenderQuestionsInsert = Database['public']['Tables']['tender_questions']['Insert']

const questionSchema = z.object({
  question_text: z.string().min(1).max(1000),
  contact_email: z.string().email().optional(),
  contact_name: z.string().max(100).optional(),
})

// Fallback OPTIONS handler — middleware handles the common case, this catches edge cases
export function OPTIONS() {
  return new NextResponse(null, { status: 200 })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const user = await getCurrentUser()
    
    if (!user) {
      return unauthorized()
    }

    const body = await request.json()
    const validatedData = questionSchema.parse(body)

    // Rate limiting check (simple implementation)
    const { count } = await supabase
      .from('tender_questions')
      .select('id', { count: 'exact', head: true })
      .eq('tender_id', params.id)
      .eq('asked_by', user.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const remainingQuestions = Math.max(0, 5 - (count || 0))
    
    if (count && count >= 5) {
      return json(
        { error: 'Du kan maksimalt stille 5 spørgsmål per dag' },
        { 
          status: 429, 
          headers: { 
            'X-RateLimit-Limit': '5', 
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          } 
        }
      )
    }

    // Sanitize question text (remove HTML)
    const sanitizedQuestion = validatedData.question_text
      .replace(/<[^>]*>/g, '')
      .trim()

    const { data, error } = await supabase
      .from('tender_questions')
      .insert({
        tender_id: params.id,
        asked_by: user.id,
        question_text: sanitizedQuestion,
        question_text_public: sanitizedQuestion, // Initially same as original
        contact_email: validatedData.contact_email,
        contact_name: validatedData.contact_name,
        is_published: false,
        is_anonymized: true,
      } as TenderQuestionsInsert)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating question:', error)
      return internal('Kunne ikke oprette spørgsmål')
    }

    return json(
      { id: data.id, message: 'Spørgsmål oprettet og afventer godkendelse' },
      { 
        status: 201,
        headers: { 
          'X-RateLimit-Limit': '5', 
          'X-RateLimit-Remaining': remainingQuestions.toString(),
          'X-RateLimit-Reset': new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest('Ugyldig data')
    }

    console.error('Error in POST /questions:', error)
    return internal('Intern server fejl')
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'published'

    // Non-public view requires authentication + tender ownership
    if (status !== 'published') {
      const user = await getCurrentUser()
      if (!user) return unauthorized()

      const isOwner = await assertTenderOwner(user.id, params.id)
      if (!isOwner) return json({ error: 'Kun tender-ejeren kan se upublicerede spørgsmål' }, 403)
    }

    let query = supabase
      .from('tender_questions')
      .select(`
        id,
        question_text,
        question_text_public,
        answer_text,
        is_published,
        is_anonymized,
        contact_email,
        contact_name,
        created_at,
        updated_at
      `)
      .eq('tender_id', params.id)

    if (status === 'published') {
      query = query.eq('is_published', true)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching questions:', error)
      return internal('Kunne ikke hente spørgsmål')
    }

    return json({
      items: data.map(q => ({
        id: q.id,
        question_text: status === 'published' ? q.question_text_public : q.question_text,
        question_text_public: q.question_text_public,
        answer_text: q.answer_text,
        is_published: q.is_published,
        is_anonymized: q.is_anonymized,
        contact_email: q.contact_email,
        contact_name: q.contact_name,
        created_at: q.created_at,
        updated_at: q.updated_at,
      }))
    })
  } catch (error) {
    console.error('Error in GET /questions:', error)
    return internal('Intern server fejl')
  }
}
