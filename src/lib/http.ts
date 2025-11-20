export const json = (data: unknown, init: number | ResponseInit = 200) =>
  new Response(JSON.stringify(data), {
    status: typeof init === 'number' ? init : init.status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    ...(typeof init === 'number' ? {} : init),
  })

export const badRequest = (msg: string) => json({ error: msg }, 400)
export const unauthorized = () => json({ error: 'unauthorized' }, 401)
export const internal = (msg = 'internal_error') => json({ error: msg }, 500)
