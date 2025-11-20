import { createServiceClient } from '../supabase/server'
import { sanitizeFileName } from '../storage'

const STORAGE_BUCKET = 'tender-docs'

export async function generateStoragePath(tenderId: string, fileName: string): Promise<string> {
  const timestamp = Date.now()
  const safeName = sanitizeFileName(fileName)
  return `${tenderId}/${timestamp}_${safeName}`
}

export async function createSignedUrl(path: string, expiresIn = 60 * 60 * 6): Promise<string> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, expiresIn)

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Kunne ikke generere download link')
  }

  return data.signedUrl
}

export async function createSignedUploadUrl(path: string) {
  const supabase = createServiceClient()
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUploadUrl(path)

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Kunne ikke generere upload link')
  }

  return data
}

export async function uploadDocument(path: string, contents: ArrayBuffer | Uint8Array, contentType: string) {
  const supabase = createServiceClient()
  const payload = contents instanceof Uint8Array ? contents : new Uint8Array(contents)

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, payload, {
    contentType,
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function deleteFile(path: string): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path])

  if (error) {
    throw new Error(error.message)
  }
}

