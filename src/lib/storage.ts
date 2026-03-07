// Client-side helper til signed URLs (visning)
import { supabase } from './supabase/client'

export async function getSignedUrl(path: string, expiresIn = 600) {
  const s = supabase()
  const { data, error } = await s.storage.from('tender-docs').createSignedUrl(path, expiresIn)
  if (error) throw error
  return data.signedUrl
}

// Helper functions for file handling
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif'
]

const MAX_FILE_SIZE_MB = parseInt(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || '10') * 1024 * 1024

export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Filtypen ${file.type} er ikke tilladt. Tilladte typer: PDF, DOC, DOCX, XLS, XLSX, ZIP, TXT, JPG, PNG, GIF`
    }
  }

  if (file.size > MAX_FILE_SIZE_MB) {
    return {
      valid: false,
      error: `Filen er for stor. Maksimal størrelse: ${process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || '10'} MB`
    }
  }

  return { valid: true }
}

export function getFileIcon(mimeType: string): string {
  switch (mimeType) {
    case 'application/pdf':
      return '📄'
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return '📝'
    case 'application/vnd.ms-excel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return '📊'
    case 'application/zip':
    case 'application/x-zip-compressed':
      return '📦'
    case 'text/plain':
      return '📄'
    case 'image/jpeg':
    case 'image/png':
    case 'image/gif':
      return '🖼️'
    default:
      return '📎'
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
