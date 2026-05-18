import { Buffer } from 'node:buffer'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/authz'
import { validateFile } from '@/lib/storage'
import { uploadDocument, deleteFile } from '@/lib/storage/server'
import { json, badRequest, unauthorized, internal } from '@/lib/http'
import type { Database } from '@/lib/supabase/types'
import { logAction } from '@/lib/audit'

type BidsInsert = Database['public']['Tables']['bids']['Insert']

export const runtime = 'nodejs'
const BID_DOCUMENTS_BUCKET = 'bid-documents'

async function generateBidStoragePath(tenderId: string, userId: string, fileName: string): Promise<string> {
  const timestamp = Date.now()
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${tenderId}/${userId}/${timestamp}_${safeName}`
}

async function uploadBidDocument(path: string, contents: ArrayBuffer | Uint8Array, contentType: string) {
  const supabase = createClient()
  const payload = contents instanceof Uint8Array ? contents : new Uint8Array(contents)

  const { error } = await supabase.storage.from(BID_DOCUMENTS_BUCKET).upload(path, payload, {
    contentType,
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    throw new Error(error.message)
  }
}

// TODO: Implement extractPriceFromFile function
// This will later parse XLS/XLSX/PDF files to extract price information
// async function extractPriceFromFile(file: File): Promise<number | null> {
//   // Implementation for parsing price from uploaded file
//   // This can use libraries like xlsx for Excel files, pdf-parse for PDFs
//   return null
// }

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    const formData = await request.formData()
    const tenderId = formData.get('tender_id') as string
    const price = formData.get('price') as string
    const currency = formData.get('currency') as string || 'DKK'
    const comment = formData.get('comment') as string || ''

    if (!tenderId || !price) {
      return badRequest('Tender ID og pris er påkrævet')
    }

    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum <= 0) {
      return badRequest('Gyldig pris er påkrævet')
    }

    // Get all uploaded files
    const files: File[] = []
    const fileEntries = formData.getAll('documents')
    for (const entry of fileEntries) {
      if (entry instanceof File) {
        const validation = validateFile(entry)
        if (validation.valid) {
          files.push(entry)
        }
      }
    }

    // Upload files to storage
    const documentPaths: string[] = []
    const uploadedFiles: { path: string; name: string }[] = []

    try {
      for (const file of files) {
        const storagePath = await generateBidStoragePath(tenderId, user.id, file.name)
        const fileBuffer = Buffer.from(await file.arrayBuffer())

        await uploadBidDocument(storagePath, fileBuffer, file.type || 'application/octet-stream')
        
        documentPaths.push(storagePath)
        uploadedFiles.push({ path: storagePath, name: file.name })
      }
    } catch (uploadError: any) {
      // Clean up any uploaded files on error
      for (const path of documentPaths) {
        await deleteFile(path).catch(() => undefined)
      }
      return badRequest(`Fejl ved upload af filer: ${uploadError.message}`)
    }

    // Insert bid into database
    const supabase = createClient()
    
    const { data: bidData, error: bidError } = await supabase
      .from('bids')
      .insert({
        tender_id: tenderId,
        supplier_id: user.id,
        created_by: user.id,
        amount: priceNum,
        currency: currency,
        documents: documentPaths.length > 0 ? documentPaths : [],
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      } as BidsInsert)
      .select('id, created_at')
      .single<{ id: string; created_at: string }>()

    if (bidError) {
      // Clean up uploaded files if database insert fails
      for (const path of documentPaths) {
        await deleteFile(path).catch(() => undefined)
      }
      console.error('Error creating bid:', bidError)
      return internal('Kunne ikke oprette bud. Prøv igen.')
    }

    await logAction(user.id, 'bid.submitted', 'tender', tenderId, { bid_id: bidData.id, amount: priceNum, currency })

    return json({
      id: bidData.id,
      message: 'Bud oprettet succesfuldt',
      created_at: bidData.created_at,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/bids:', error)
    return internal('Intern server fejl')
  }
}

