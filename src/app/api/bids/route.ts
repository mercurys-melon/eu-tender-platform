import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { NextRequest } from 'next/server'
import { createClient, getServiceClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/authz'
import { validateFile, sanitizeFileName } from '@/lib/storage'
import { json, badRequest, unauthorized, internal } from '@/lib/http'
import type { Database } from '@/lib/supabase/types'
import { logAction } from '@/lib/audit'

type BidsInsert = Database['public']['Tables']['bids']['Insert']

export const runtime = 'nodejs'

/**
 * Privat bucket til tilbudsfiler. Læses KUN server-side via signerede URL'er
 * efter tilbudsfristen (BEK 1572: fortrolighed indtil åbning).
 */
const BID_DOCUMENTS_BUCKET = 'bid-documents'

/**
 * POST /api/bids — afgiv tilbud.
 *
 * Forsvar i dybden: RLS-policy "bids_supplier_insert" håndhæver allerede
 * status='published' og frist > NOW(). Vi tjekker det samme eksplicit her,
 * så filer ALDRIG uploades til et udbud, der ikke modtager tilbud.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const formData = await request.formData().catch(() => null)
    if (!formData) return badRequest('Ugyldig formular')

    const tenderId = String(formData.get('tender_id') ?? '')
    const price = String(formData.get('price') ?? '')
    const currency = String(formData.get('currency') ?? 'DKK').toUpperCase()

    if (!tenderId || !price) return badRequest('Tender ID og pris er påkrævet')
    if (!/^[A-Z]{3}$/.test(currency)) return badRequest('Ugyldig valuta')

    const priceNum = Number(price.replace(',', '.'))
    if (!Number.isFinite(priceNum) || priceNum <= 0) return badRequest('Gyldig pris er påkrævet')

    const supabase = createClient()

    // 1. Udbuddet skal være publiceret og fristen ikke udløbet
    const { data: tender, error: tenderError } = await supabase
      .from('tenders')
      .select('id, status, submission_deadline')
      .eq('id', tenderId)
      .maybeSingle()

    if (tenderError || !tender) return json({ error: 'Udbuddet findes ikke' }, 404)
    if (tender.status !== 'published') {
      return json({ error: 'Udbuddet modtager ikke tilbud' }, 409)
    }
    if (new Date(tender.submission_deadline).getTime() <= Date.now()) {
      return json({ error: 'Tilbudsfristen er udløbet' }, 409)
    }

    // 2. Ét aktivt tilbud pr. tilbudsgiver. Nyt tilbud = træk det gamle tilbage først.
    const { data: existing } = await supabase
      .from('bids')
      .select('id')
      .eq('tender_id', tenderId)
      .eq('supplier_id', user.id)
      .limit(1)

    if (existing && existing.length > 0) {
      return json(
        { error: 'Du har allerede afgivet tilbud. Træk det tilbage for at afgive et nyt.' },
        409,
      )
    }

    // 3. Filer: afvis hele afgivelsen hvis én fil er ugyldig (ingen stille frasortering)
    const files: File[] = []
    for (const entry of formData.getAll('documents')) {
      if (!(entry instanceof File) || entry.size === 0) continue
      const validation = validateFile(entry)
      if (!validation.valid) return badRequest(`${entry.name}: ${validation.error}`)
      files.push(entry)
    }

    // 4. Upload med service-role (autorisation er verificeret ovenfor)
    const storage = getServiceClient().storage.from(BID_DOCUMENTS_BUCKET)
    const documentPaths: string[] = []

    const cleanup = async () => {
      if (documentPaths.length > 0) {
        await storage.remove(documentPaths).catch(() => undefined)
      }
    }

    try {
      for (const file of files) {
        const path = `${tenderId}/${user.id}/${randomUUID()}-${sanitizeFileName(file.name)}`
        const { error } = await storage.upload(path, Buffer.from(await file.arrayBuffer()), {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        })
        if (error) throw new Error(error.message)
        documentPaths.push(path)
      }
    } catch (uploadError) {
      await cleanup()
      console.error('[POST /api/bids] upload fejlede:', uploadError)
      return internal('Upload af filer fejlede. Prøv igen.')
    }

    // 5. Indsæt bid med brugerens klient, så RLS-policyen også håndhæves i DB
    const submittedAt = new Date().toISOString()
    const { data: bidData, error: bidError } = await supabase
      .from('bids')
      .insert({
        tender_id: tenderId,
        supplier_id: user.id,
        created_by: user.id,
        amount: priceNum,
        currency,
        documents: documentPaths,
        status: 'submitted',
        submitted_at: submittedAt,
      } satisfies BidsInsert)
      .select('id, created_at, submitted_at')
      .single()

    if (bidError || !bidData) {
      await cleanup()
      console.error('[POST /api/bids] insert fejlede:', bidError?.code, bidError?.message)
      return internal('Kunne ikke afgive tilbud. Prøv igen.')
    }

    // VIGTIGT: Audit må ALDRIG indeholde pris/valuta — audit_logs kan læses af
    // ordregiver, og ville ellers lække tilbudsindhold før fristen.
    await logAction(user.id, 'bid.submitted', 'tender', tenderId, {
      bid_id: bidData.id,
      file_count: documentPaths.length,
    })

    return json(
      {
        id: bidData.id,
        message: 'Tilbud modtaget',
        // Kvittering: serverens tidsstempel er det juridisk relevante
        submitted_at: bidData.submitted_at,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error in POST /api/bids:', error)
    return internal('Intern server fejl')
  }
}
