'use client'
import { useEffect, useMemo, useState } from 'react'

export default function TenderSearch() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [cpv, setCpv] = useState<string>('')           // kommagsepareret, simpelt UI
  const [buyer, setBuyer] = useState('')
  const [publishedFrom, setPublishedFrom] = useState('')
  const [publishedTo, setPublishedTo] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const qs = useMemo(() => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (buyer) sp.set('buyer', buyer)
    if (cpv) cpv.split(',').map(s => s.trim()).filter(Boolean).forEach(c => sp.append('cpv', c))
    if (publishedFrom) sp.set('publishedFrom', publishedFrom)
    if (publishedTo) sp.set('publishedTo', publishedTo)
    sp.set('providers','udbuddk'); sp.append('providers','ted')
    sp.set('page', String(page))
    sp.set('pageSize','20')
    sp.set('sortBy','published'); sp.set('sortDir','desc')
    return sp.toString()
  }, [q, buyer, cpv, publishedFrom, publishedTo, page])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/search?${qs}`).then(r=>r.json()).then(setData).finally(()=>setLoading(false))
  }, [qs])

  return (
    <div className="space-y-4">
      {/* Filterpanel */}
      <div className="card p-4 grid md:grid-cols-5 gap-3">
        <input className="input" placeholder="Søg ord…" value={q} onChange={e=>{ setPage(1); setQ(e.target.value) }} />
        <input className="input" placeholder="Ordregiver" value={buyer} onChange={e=>{ setPage(1); setBuyer(e.target.value) }} />
        <input className="input" placeholder="CPV (kommasepareret)" value={cpv} onChange={e=>{ setPage(1); setCpv(e.target.value) }} />
        <input className="input" type="date" value={publishedFrom} onChange={e=>{ setPage(1); setPublishedFrom(e.target.value) }} />
        <input className="input" type="date" value={publishedTo} onChange={e=>{ setPage(1); setPublishedTo(e.target.value) }} />
      </div>

      {loading && <div>Indlæser…</div>}

      {!loading && data && (
        <>
          <div className="grid gap-3">
            {data.items.map((t: any) => (
              <a key={t.id} href={t.url} target="_blank" className="card p-4 hover:shadow-blockbid-lg transition">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-h3">{t.title}</h3>
                    <p className="text-small text-slate-grey">
                      {t.buyer} {t.country ? `· ${t.country}` : ''} {t.publishedAt ? `· Offentliggjort ${t.publishedAt}` : ''}
                    </p>
                    <p className="text-small text-slate-grey">
                      {t.deadlineAt ? `Frist ${t.deadlineAt}` : ''} {t.estValue ? `· ${t.estValue} ${t.currency || ''}` : ''}
                    </p>
                  </div>
                  <span className="text-small text-slate-grey uppercase">{t.source}</span>
                </div>
              </a>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-small text-slate-grey">
              Viser {(data.page-1)*data.pageSize + 1}–{Math.min(data.page*data.pageSize, data.total)} af {data.total}
            </span>
            <div className="flex gap-2">
              <button disabled={page<=1} className="btn-outline" onClick={()=>setPage(p=>p-1)}>Forrige</button>
              <button disabled={(page*data.pageSize)>=data.total} className="btn-primary" onClick={()=>setPage(p=>p+1)}>Næste</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
