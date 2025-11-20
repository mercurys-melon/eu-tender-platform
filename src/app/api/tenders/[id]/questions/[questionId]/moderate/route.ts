import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, assertTenderOwner } from '@/lib/authz'
import { z } from 'zod'
import { json, badRequest, unauthorized, internal } from '@/lib/http'

const moderationSchema = z.object({
  question_text_public: z.string().max(1000).optional(),
  is_anonymized: z.boolean().optional(),
  answer_text: z.string().max(2000).optional(),
  publish: z.boolean().optional(),
  unpublish: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    const supabase = createClient()
    const user = await getCurrentUser()
    
    if (!user) {
      return unauthorized()
    }

    // Check if user is tender owner
    const isOwner = await assertTenderOwner(user.id, params.id)
    if (!isOwner) {
      return json(
        { error: 'Du har ikke tilladelse til at moderere dette udbud' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = moderationSchema.parse(body)

    // Get current question
    const { data: currentQuestion, error: fetchError } = await supabase
      .from('tender_questions')
      .select('*')
      .eq('id', params.questionId)
      .eq('tender_id', params.id)
      .single()

    if (fetchError || !currentQuestion) {
      return json(
        { error: 'Spørgsmål ikke fundet' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    if (validatedData.question_text_public !== undefined) {
      // Sanitize public question text
      updateData.question_text_public = validatedData.question_text_public
        .replace(/<[^>]*>/g, '')
        .trim()
    }

    if (validatedData.is_anonymized !== undefined) {
      updateData.is_anonymized = validatedData.is_anonymized
    }

    if (validatedData.answer_text !== undefined) {
      // Sanitize answer text
      updateData.answer_text = validatedData.answer_text
        .replace(/<[^>]*>/g, '')
        .trim()
    }

    // Handle publish/unpublish
    if (validatedData.publish) {
      updateData.is_published = true
    } else if (validatedData.unpublish) {
      updateData.is_published = false
    }

    // Update the question
    const { data, error } = await supabase
      .from('tender_questions')
      .update(updateData)
      .eq('id', params.questionId)
      .eq('tender_id', params.id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating question:', error)
      return internal('Kunne ikke opdatere spørgsmål')
    }

    return json({
      ok: true,
      question: {
        id: data.id,
        question_text_public: data.question_text_public,
        answer_text: data.answer_text,
        is_published: data.is_published,
        is_anonymized: data.is_anonymized,
        updated_at: data.updated_at,
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest('Ugyldig data')
    }

    console.error('Error in PATCH /moderate:', error)
    return internal('Intern server fejl')
  }
}
