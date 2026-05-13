/**
 * Udbud.dk client med OIDC token-flow og miljø-adskillelse.
 *
 * KRITISK: Adskillelsen mellem PREPROD og PROD afhænger udelukkende af URL —
 * samme Basic Auth credentials bruges til begge miljøer (bekræftet af ERST, april 2026).
 * Guards er URL-baserede og kræver eksplicit miljø-valg via UDBUD_DK_ENV.
 *
 * OIDC-flow per openapi-udbud.yml:
 *   1. POST {tokenUrl}  (URL inkluderer ?grant_type=client_credentials)
 *      Authorization: Basic base64(user:pass)
 *      Content-Type: application/x-www-form-urlencoded
 *   2. Modtag { access_token: string, expires_in: number }  (expires_in ≈ 600s fra ERST)
 *   3. Bearer {accessToken} på alle efterfølgende API-kald
 *   4. Automatisk refresh 60s før token-udløb (TOKEN_REFRESH_MARGIN_MS)
 */

import { env } from '@/config/env'

export type UdbudDkEnvironment = 'preprod' | 'prod'

interface TokenCacheEntry {
  accessToken: string
  expiresAt: number // Unix-tidsstempel i ms
}

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number // sekunder — ERST returnerer typisk 600
}

// In-memory token-cache, separat per miljø.
// Nulstilles ved server-genstart — det er tilsigtet og ønsket adfærd.
const tokenCache: Record<UdbudDkEnvironment, TokenCacheEntry | null> = {
  preprod: null,
  prod: null,
}

// 60s safety margin er passende: ERST's expires_in er 600s, så vi
// refresher senest efter 540s aktiv brug uden at risikere 401 mid-request.
const TOKEN_REFRESH_MARGIN_MS = 60_000
const TOKEN_FETCH_TIMEOUT_MS = 5_000
const API_CALL_TIMEOUT_MS = 10_000

/**
 * Hård guard: PROD-kald må KUN ske i NODE_ENV=production.
 *
 * Selvom Basic Auth credentials er identiske for begge miljøer (ERST-bekræftet),
 * er URL-adskillelse den eneste sikring mod utilsigtet publicering til
 * den levende danske udbudsportal. Denne guard er første forsvarslinje.
 */
function assertEnvironmentSafety(targetEnv: UdbudDkEnvironment): void {
  if (targetEnv === 'prod' && process.env.NODE_ENV !== 'production') {
    throw new Error(
      `[UDBUD-DK] PROD-kald blokeret: NODE_ENV="${process.env.NODE_ENV}" er ikke "production". ` +
        'Sæt NODE_ENV=production og UDBUD_DK_ENV=prod eksplicit for at tillade PROD-publicering.',
    )
  }
}

/**
 * Hent og valider URLs for det aktive miljø.
 *
 * Begge URL'er (apiUrl + tokenUrl) skal være sat — en manglende URL er en
 * konfigurations-bug der fanges tidligt med præcis fejlmeddelelse.
 */
function getEnvironmentUrls(targetEnv: UdbudDkEnvironment): {
  apiUrl: string
  tokenUrl: string
} {
  if (targetEnv === 'prod') {
    const missing: string[] = []
    if (!env.udbudDk.prodApiUrl) missing.push('UDBUD_DK_PROD_API_URL')
    if (!env.udbudDk.prodTokenUrl) missing.push('UDBUD_DK_PROD_TOKEN_URL')
    if (missing.length > 0) {
      throw new Error(
        `[UDBUD-DK] UDBUD_DK_ENV=prod kræver følgende env-variable (mangler): ${missing.join(', ')}`,
      )
    }
    return {
      apiUrl: env.udbudDk.prodApiUrl!,
      tokenUrl: env.udbudDk.prodTokenUrl!,
    }
  }

  // preprod
  const missing: string[] = []
  if (!env.udbudDk.preprodApiUrl) missing.push('UDBUD_DK_PREPROD_API_URL')
  if (!env.udbudDk.preprodTokenUrl) missing.push('UDBUD_DK_PREPROD_TOKEN_URL')
  if (missing.length > 0) {
    throw new Error(
      `[UDBUD-DK] UDBUD_DK_ENV=preprod kræver følgende env-variable (mangler): ${missing.join(', ')}`,
    )
  }
  return {
    apiUrl: env.udbudDk.preprodApiUrl!,
    tokenUrl: env.udbudDk.preprodTokenUrl!,
  }
}

function isCacheValid(targetEnv: UdbudDkEnvironment): boolean {
  const cached = tokenCache[targetEnv]
  if (!cached) return false
  return Date.now() < cached.expiresAt - TOKEN_REFRESH_MARGIN_MS
}

/**
 * Hent OIDC access token via Basic Auth → client_credentials flow.
 *
 * Cacher token per miljø og refresher automatisk 60s før udløb.
 * ALDRIG log access_token eller credentials — kun status og levetid.
 */
async function fetchAccessToken(targetEnv: UdbudDkEnvironment): Promise<string> {
  if (isCacheValid(targetEnv)) {
    return tokenCache[targetEnv]!.accessToken
  }

  // Credentials-tjek: kræves for begge miljøer (ERST bekræftet: samme par til PREPROD og PROD)
  const missing: string[] = []
  if (!env.udbudDk.basicUser) missing.push('UDBUD_DK_BASIC_USER')
  if (!env.udbudDk.basicPass) missing.push('UDBUD_DK_BASIC_PASS')
  if (missing.length > 0) {
    throw new Error(
      `[UDBUD-DK] Basic Auth credentials mangler for OIDC-flow: ${missing.join(', ')}`,
    )
  }

  const { tokenUrl } = getEnvironmentUrls(targetEnv)

  // Basic Auth header — ALDRIG log den rå værdi
  const basicAuth = Buffer.from(
    `${env.udbudDk.basicUser}:${env.udbudDk.basicPass}`,
  ).toString('base64')

  console.log(`[UDBUD-DK ${targetEnv}] henter ny access token`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TOKEN_FETCH_TIMEOUT_MS)

  try {
    // tokenUrl inkluderer allerede ?grant_type=client_credentials (per openapi-udbud.yml)
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(
        `[UDBUD-DK ${targetEnv}] token-hentning fejlede: HTTP ${response.status} ${response.statusText}` +
          (errText ? ` — ${errText.substring(0, 200)}` : ''),
      )
    }

    const data = (await response.json()) as TokenResponse

    if (!data.access_token) {
      throw new Error(`[UDBUD-DK ${targetEnv}] token-svar mangler access_token-felt`)
    }

    // Cache token med udløbstidspunkt fra expires_in (ERST: typisk 600s)
    tokenCache[targetEnv] = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    }

    console.log(
      `[UDBUD-DK ${targetEnv}] access token hentet (udløber om ${data.expires_in}s)`,
    )

    return data.access_token
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Udfør autentificeret HTTP-request mod Udbud.dk API.
 *
 * Håndterer i rækkefølge:
 * 1. Miljø-guard (PROD blokeres uden for production-runtime)
 * 2. URL-validering for det aktive miljø (begge URLs skal være sat)
 * 3. OIDC token-hentning eller cache-opslag
 * 4. HTTP-kald med timeout (10s via AbortController)
 *
 * @returns Rå fetch-Response — caller er ansvarlig for HTTP-statuskode-håndtering
 *
 * @example
 * // Publicer en bekendtgørelse
 * const res = await callUdbudDkApi({
 *   path: '/ekstern-data/bekendtgoerelse/v1/eforms-sdk-dk-1.13.0-1.3.0/publicer',
 *   method: 'POST',
 *   body: payload,
 *   idempotencyKey: requestId,
 * })
 */
export async function callUdbudDkApi(options: {
  path: string          // inkl. leading slash, f.eks. '/ekstern-data/bekendtgoerelse/v1/.../publicer'
  method?: 'GET' | 'POST'
  body?: unknown
  idempotencyKey?: string
}): Promise<Response> {
  const targetEnv = env.udbudDk.env

  // Guard 1: PROD er blokeret uden for production-runtime (første forsvarslinje)
  assertEnvironmentSafety(targetEnv)

  // Guard 2: URLs valideres tidligt — kaster med præcis fejlbesked ved manglende config
  const { apiUrl } = getEnvironmentUrls(targetEnv)

  // Token: hentes fra cache eller refreshes via OIDC
  const accessToken = await fetchAccessToken(targetEnv)

  const method = options.method ?? 'GET'
  const url = `${apiUrl}${options.path}`

  console.log(
    `[UDBUD-DK ${targetEnv}] ${method} ${options.path}` +
      (options.idempotencyKey ? ` idempotency=${options.idempotencyKey}` : ''),
  )

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_CALL_TIMEOUT_MS)

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    }
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }
    if (options.idempotencyKey) {
      headers['X-Idempotency-Key'] = options.idempotencyKey
    }

    return await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Returnerer det konfigurerede aktive miljø.
 * Bruges af call sites (service.ts, search-provider) til logging og audit-trail.
 */
export function getActiveUdbudDkEnvironment(): UdbudDkEnvironment {
  return env.udbudDk.env
}
