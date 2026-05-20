# P1-Client Audit — 19. maj 2026

Inspect-only audit af `src/lib/publication/udbud-dk-client.ts` og dens omgivelser,
udført som del af session 19. maj 2026 efter schema-drift-opdagelser.

**Auditeret kode:** `src/lib/publication/udbud-dk-client.ts` (258 linjer),
`src/config/env.ts` (220 linjer), `.env.example` (54 linjer).

**Auditor:** Claude.ai (web) baseret på cat-output fra Claude Code.

**Auditen er inspect-only.** Ingen kode-ændringer foretaget. Anbefalinger
implementeres i dedikerede sessioner.

---

## Sammenfatning

| Kategori | Antal |
|---|---|
| 🔴 Kritisk (blocker for PROD) | 0 |
| ⚠️ Bemærkning (fix før PROD) | 5 |
| ⚠️ Bemærkning (efter pilot) | 2 |
| ⚠️ Bemærkning (når scaling-mønstret er afklaret) | 1 |

**Samlet vurdering:** Klienten fungerer som intended for nuværende use case
(PREPROD-tests, lav concurrency, single Vercel-instans). PREPROD-funktionel
test 18. maj bekræfter end-to-end-funktionalitet. Klienten er ikke
produktionsklar — flere fælder venter på fremtidige miljø-rotationer eller
concurrent traffic.

---

## Audit-punkter

### ① Token-URL grant_type-håndtering — ⚠️ Bemærkning

**Fund:**
- `udbud-dk-client.ts` linje 141-142 forudsætter at `tokenUrl` allerede
  indeholder `?grant_type=client_credentials`. Klienten gør ingen kontrol.
- `env.ts` linje 70-71 validerer kun at det er en gyldig URL (`optionalUrl()`),
  ikke at query-param er på.

**Risiko:** Hvis token-URL ved en fejl sættes uden `grant_type` (copy-paste
fra standard OIDC-doc, ny dev-maskine, env-rotation), fejler systemet stille.
ERST returnerer 400 uden klar diagnostik. PREPROD virker fordi `.env.local`
har den korrekte URL — der er ingen sikkerhedssele.

**Anbefaling:** Stram env-validering med `.refine()`:

\`\`\`typescript
UDBUD_DK_PREPROD_TOKEN_URL: z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().url().refine(
    (url) => url.includes('grant_type=client_credentials'),
    'Token-URL skal indeholde ?grant_type=client_credentials (ERST-krav)',
  ).optional(),
),
\`\`\`

Samme for `UDBUD_DK_PROD_TOKEN_URL`.

**Prioritet:** Fix før PROD-go-live. Frank bekræftet OK til anbefaling.

---

### ② SDK-version-format konsistens — ⚠️ Bemærkning

**Fund:**
- `env.ts` linje 86-95 har regex der accepterer **tre** formater: semver
  (`1.13.2`), dansk extension uden prefix (`1.13.0-1.3.0`), eller fuldt
  ERST-format (`eforms-sdk-dk-1.13.0-1.3.0`).
- ERST kræver fuldt format med `eforms-sdk-dk-`-prefiks. Klient-kald med
  forkert format fejler med HTTP 409.

**Risiko:** Configs der har semver-only eller dansk-extension-only passerer
env-validation, men fejler ved første ERST-kald. "For forgivende validation"
— vi er glade når vi accepterer ugyldig input.

**Anbefaling:** Stram regex til kun at acceptere fuldt format. Frank er
eneste dev — argumentet for bagudkompatibilitet bortfalder:

\`\`\`typescript
EFORMS_SDK_VERSION: z.preprocess(
  (v) => (v === '' ? undefined : v),
  z
    .string()
    .regex(
      /^eforms-sdk-dk-\d+\.\d+\.\d+-\d+\.\d+\.\d+$/,
      'EFORMS_SDK_VERSION skal være fuldt ERST-format (eforms-sdk-dk-1.13.0-1.3.0)',
    )
    .optional(),
),
\`\`\`

**Prioritet:** Fix før PROD-go-live.

---

### ③ Token-cache global mutable state — to separate problemer

#### ③.1 Per-instans cache — ⚠️ Bemærkning (når scaling-mønstret er afklaret)

**Fund:** `udbud-dk-client.ts` linje 32-37: module-level mutable state for
cache per miljø. Hver Node.js-instans har sin egen cache.

**Risiko:** Ved horizontal scaling (flere Vercel-instanser) vil hver instans
fetche selvstændige tokens. Unødvendig belastning på ERST's token-endpoint
+ små inkonsistenser i token-lifecycle på tværs af instanser.

**Anbefaling:** Migrer til Redis eller Vercel KV når horizontal scaling
introduceres. Single-instans deployment har ingen reel risiko.

**Prioritet:** Udskydes til scaling-mønster er afklaret.

#### ③.2 Race condition mellem requests i samme instans — ⚠️ Bemærkning (fix før concurrent users)

**Fund (ny):** Hvis to requests rammer samme instans samtidig og cache er
invalid, kører begge `fetchAccessToken` parallelt og overskriver hinandens
cache-skriv. Resultatet: 2 tokens hentet i stedet for 1.

**Risiko:** Ikke en crash, men unødvendig belastning på ERST's token-endpoint
+ potentielt rate-limit-eksponering.

**Anbefaling:** "In-flight promise"-pattern — concurrent requests joiner
samme pending fetch:

\`\`\`typescript
const tokenFetchInFlight: Record<UdbudDkEnvironment, Promise<string> | null> = {
  preprod: null,
  prod: null,
}

async function fetchAccessToken(targetEnv: UdbudDkEnvironment): Promise<string> {
  if (isCacheValid(targetEnv)) return tokenCache[targetEnv]!.accessToken
  
  if (tokenFetchInFlight[targetEnv]) {
    return tokenFetchInFlight[targetEnv]!
  }
  
  tokenFetchInFlight[targetEnv] = (async () => {
    try {
      // ... eksisterende fetch-logik (linje 118-178)
    } finally {
      tokenFetchInFlight[targetEnv] = null
    }
  })()
  
  return tokenFetchInFlight[targetEnv]!
}
\`\`\`

**Prioritet:** Fix før concurrent users (pre-pilot eller tidlig post-pilot).

---

## Bonus-fund

### A. console.log i klient-kode — ⚠️ Observation

**Fund:** Klienten bruger `console.log` på linje 135, 171-172, 221-223.
CLAUDE.md specificerer "Structured logging via pino".

**Risiko:** Inkonsistens med projektets logging-standard. Vercel/Sentry log
parsing forventer struktureret format.

**Anbefaling:** Skift til pino. Frank: OK til observation. Handling i
dedikeret session (estimat 30-45 min).

**Prioritet:** Fix før PROD log-parsing aktiveres.

---

### B. PROD-guard er svagere end den ser ud — ⚠️ Defense-in-depth

**Fund:** `assertEnvironmentSafety` linje 52-58 checker kun
`NODE_ENV === 'production'`. En dev der lokalt sætter `NODE_ENV=production`
for at teste prod-build vil passere guarden.

**Risiko:** Single-point-of-failure mod utilsigtet PROD-publicering.

**Anbefaling:** Tilføj `process.env.VERCEL_ENV === 'production'` (eller
anden deployment-detection) som andet uafhængigt lag:

\`\`\`typescript
function assertEnvironmentSafety(targetEnv: UdbudDkEnvironment): void {
  if (targetEnv !== 'prod') return
  
  const isProductionRuntime = process.env.NODE_ENV === 'production'
  const isProductionDeployment = process.env.VERCEL_ENV === 'production'
  
  if (!isProductionRuntime || !isProductionDeployment) {
    throw new Error(
      `[UDBUD-DK] PROD-kald blokeret. ` +
      `NODE_ENV="${process.env.NODE_ENV}", VERCEL_ENV="${process.env.VERCEL_ENV}". ` +
      'Begge skal være "production" for at tillade PROD-publicering.',
    )
  }
}
\`\`\`

**Prioritet:** Fix før PROD-go-live.

---

### C. Deprecated env-vars accepteres stille — ⚠️ UX-issue

**Fund:** `env.ts` linje 72-79 har 4 deprecated keys (`UDBUD_DK_API_KEY`,
`UDBUD_DK_PREPROD_URL`, `UDBUD_DK_PROD_URL`, `UDBUD_DK_DEMO_URL`) der
accepteres uden warning.

**Risiko:** Dev opdager først at deres config er forældet når noget bryder.

**Anbefaling:** Console.warn ved opstart hvis deprecated keys er sat:

\`\`\`typescript
function warnAboutDeprecatedKeys(env: Record<string, unknown>) {
  const deprecated = [
    'UDBUD_DK_API_KEY',
    'UDBUD_DK_PREPROD_URL',
    'UDBUD_DK_PROD_URL',
    'UDBUD_DK_DEMO_URL',
  ]
  const set = deprecated.filter((key) => env[key] && env[key] !== '')
  if (set.length > 0) {
    console.warn(
      `[ENV] Deprecated env-vars detected: ${set.join(', ')}. ` +
      `Disse er ikke længere i brug og bør fjernes fra .env.local.`,
    )
  }
}
\`\`\`

Kald ved opstart (efter `serverSchema.parse`).

**Prioritet:** Fix før PROD-go-live (lav-prioritet, men hurtig).

---

### D. Ingen retry-logik for transient errors — ⚠️ Resilience

**Fund:** Ingen retry på network timeout, 5xx-fejl, eller `ECONNRESET`.

**Risiko:** Kortvarige ERST-outages bliver til klient-fejl. Manuel retry
kræves fra UI.

**Anbefaling:** Exponential backoff for transient errors (3 attempts,
100ms/500ms/2s):

- Retry på: network errors, 502, 503, 504
- Ingen retry på: 4xx (klient-fejl, retry hjælper ikke)
- Retry kun for idempotente operationer eller hvor idempotency-key håndteres

**Prioritet:** Efter første PROD-publikation (1-2 timer arbejde).

---

### E. Mangler correlation-id til ERST-support — ⚠️ Operations

**Fund:** `idempotencyKey` logges, men der er ikke et separat request-id
der matcher ERST's interne logging.

**Risiko:** Når ERST siger "request fejlede på vores side", har vi ikke
en string at give dem.

**Anbefaling:** Generer UUID per request, log den, sæt den som
`X-Request-Id`-header (eller ERST's konvention hvis de har en — afklares
via `system@udbud.dk`):

\`\`\`typescript
const requestId = crypto.randomUUID()
console.log(`[UDBUD-DK ${targetEnv}] ${method} ${path} requestId=${requestId}`)
headers['X-Request-Id'] = requestId
\`\`\`

**Prioritet:** Operations-værdi, lav prio. Bør indgå i samme session som
A (pino-migration), så al logging tunes samtidig.

---

## Prioriteret handlingsliste

| # | Audit-punkt | Prioritet | Estimat | Trigger |
|---|---|---|---|---|
| 1 | ① Token-URL validering | P0 | 15 min | Før PROD |
| 2 | ② SDK-version stramning | P0 | 15 min | Før PROD |
| 3 | B. PROD-guard tredje lag | P0 | 30 min | Før PROD |
| 4 | C. Deprecated env warnings | P1 | 15 min | Før PROD |
| 5 | A. console.log → pino | P1 | 30-45 min | Før PROD log-parsing |
| 6 | E. Correlation-id | P1 | 30 min | Bundtet med A |
| 7 | ③.2 Token-fetch race condition | P2 | 30 min | Før concurrent users |
| 8 | D. Retry-logik | P3 | 1-2 t | Efter første PROD-publikation |
| 9 | ③.1 Token-cache → Redis/KV | P4 | 3-4 t | Når horizontal scaling introduceres |

**Total estimat til pre-PROD-ready (P0+P1):** ~2-3 timer fokuseret arbejde.

---

## Verifikation efter implementering

Når ovenstående fixes implementeres, skal følgende verificeres:

1. PREPROD-funktionel test stadig grøn (`scripts/udbud-functional-test.mjs`)
2. `tsc --noEmit` rent
3. `npm run build` rent
4. Manuel inspect: kør med forkert `EFORMS_SDK_VERSION` i `.env.local` —
   skal fejle ved opstart med præcis fejlmeddelelse
5. Manuel inspect: kør med token-URL uden `grant_type` — skal fejle ved
   opstart
6. Manuel inspect: sæt `UDBUD_DK_ENV=prod` i dev — skal fejle ved første
   API-kald med ny besked

---

*Auditen er gennemført uden adgang til `.env.local` (credentials beskyttet).
Audit-konklusioner er baseret udelukkende på committed kode og `.env.example`.*