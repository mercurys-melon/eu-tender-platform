import { getServiceClient } from '@/lib/supabase/server'
import { randomUUID } from 'node:crypto'
export const STORAGE_BUCKET = 'tender-docs'
export async function uploadBufferToTenderBucket(
  tenderId: string, fileName: string, mimeType: string, buffer: Buffer
) {
  const s = getServiceClient()
  const key = `${tenderId}/${randomUUID()}-${fileName.replace(/[^\w\-.]+/g,'_')}`
  // VIGTIGT: brug Blob så types matcher i supabase-js v2
  const blob = new Blob([buffer], { type: mimeType || "application/octet-stream" })
  const { error } = await s.storage.from(STORAGE_BUCKET).upload(key, blob, {
    contentType: mimeType || "application/octet-stream",
    upsert: false,
  })
  if (error) throw error
  return key
}
export async function signUrl(path: string, expiresIn = 600) {
  const s = getServiceClient()
  const { data, error } = await s.storage.from(STORAGE_BUCKET).createSignedUrl(path, expiresIn)
  if (error) throw error
  return data.signedUrl
}

// Compatibility exports
export async function uploadDocument(path: string, contents: ArrayBuffer | Uint8Array, contentType: string) {
  const supabase = getServiceClient()
  const payload = contents instanceof Uint8Array ? contents : new Uint8Array(contents)
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, payload, {
    contentType,
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw new Error(error.message)
}

export async function deleteFile(path: string): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path])
  if (error) throw new Error(error.message)
}
