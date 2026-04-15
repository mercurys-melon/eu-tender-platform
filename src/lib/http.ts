export const json = (data: unknown, init: number | ResponseInit = 200) => {
  const status = typeof init === 'number' ? init : (init.status ?? 200)
  const extraHeaders = typeof init === 'number' ? {} : (init.headers as Record<string, string> ?? {})
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders },
  })
}

export const badRequest = (msg: string) => json({ error: msg }, 400)
export const unauthorized = () => json({ error: 'unauthorized' }, 401)
export const notFound = (msg = 'not_found') => json({ error: msg }, 404)
export const internal = (msg = 'internal_error') => json({ error: msg }, 500)
