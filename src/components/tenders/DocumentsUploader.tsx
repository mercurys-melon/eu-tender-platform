'use client'
import { useState } from 'react'
export default function DocumentsUploader({ tenderId, onUploadComplete }: { tenderId: string; onUploadComplete?: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUrl, setLastUrl] = useState<string | null>(null)
  async function handleUpload() {
    if (!file) return
    setBusy(true); setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/tenders/${tenderId}/documents/upload`, { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Upload failed')
      setLastUrl(json.signed_url)
      onUploadComplete?.()
    } catch (e: any) { setError(e.message || 'Upload failed') }
    finally { setBusy(false) }
  }
  return (
    <div className="space-y-3">
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={busy} />
      <button className="rounded-xl px-4 py-2 border" onClick={handleUpload} disabled={!file || busy}>
        {busy ? 'Uploader…' : 'Upload'}
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {lastUrl && <p className="text-sm">Fil uploadet. <a className="underline" target="_blank" href={lastUrl}>Åbn</a></p>}
    </div>
  )
}
