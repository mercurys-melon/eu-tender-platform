declare const EdgeRuntime: string | undefined

export function isEdgeRuntime() {
  return typeof EdgeRuntime !== 'undefined'
}

