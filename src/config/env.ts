/**
 * Env-konfiguration for eu-tender-platform (Next.js).
 *
 * - Server-side (Node.js): validerer med zod og fejler hårdt ved manglende required vars.
 * - Edge runtime + browser: bruger process.env direkte (kun NEXT_PUBLIC_* er tilgængeligt).
 *
 * Jf. CLAUDE.md sessionsstart-checklist pkt. 1.
 *
 * Nye felter (ift. v1): TED-udvidelse, Udbud.dk, ESPD, Anthropic, OpenAI,
 * Sentry, Supabase-region, runtime-felter, mTLS/OCES3.
 */
import { z } from 'zod'

const isEdge = () => typeof (globalThis as any).EdgeRuntime !== 'undefined'
const isBrowser = () => typeof window !== 'undefined'

// process.env returnerer "" for variable sat uden værdi i .env.local — ikke undefined.
// Disse helpers konverterer tomme strenge til undefined inden zod-validering.
const optionalUrl = () =>
  z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional())

const optionalStr = () =>
  z.preprocess((v) => (v === '' ? undefined : v), z.string().optional())

const urlWithDefault = (fallback: string) =>
  z.preprocess((v) => (v === '' ? undefined : v), z.string().url().default(fallback))

const serverSchema = z.object({
  // --- App / runtime ---
  NODE_ENV: z
    .enum(['development', 'test', 'staging', 'production'])
    .default('development'),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
  NEXT_PUBLIC_APP_URL: urlWithDefault('https://mercurrytender.dk'),
  DEFAULT_TIMEZONE: z.string().default('Europe/Copenhagen'),

  // --- Supabase ---
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // Service role: påkrævet server-side, men skipped i edge runtime (se nederst)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_REGION: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .string()
      .regex(
        /^eu-/,
        'SUPABASE_REGION skal starte med "eu-" - EU residency er påkrævet (GDPR + offentligt indkøb)',
      )
      .optional(),
  ),

  // --- Udbud.dk (ERST) ---
  // UDBUD_DK_ENV styrer hvilket miljø der publiceres til.
  // Default 'preprod' er en sikkerhedsforsvarslinje: utilsigtet publicering til den
  // danske udbudsportal undgås ved at kræve eksplicit valg af 'prod'.
  // VIGTIGT: Adskillelsen er 100% URL-baseret — samme Basic Auth credentials
  // bruges til både PREPROD og PROD (bekræftet af ERST, april 2026).
  UDBUD_DK_ENV: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.enum(['preprod', 'prod']).default('preprod'),
  ),
  UDBUD_DK_BASIC_USER: optionalStr(),
  UDBUD_DK_BASIC_PASS: optionalStr(),
  UDBUD_DK_PREPROD_API_URL: optionalUrl(),
  UDBUD_DK_PROD_API_URL: optionalUrl(),
  UDBUD_DK_PREPROD_TOKEN_URL: optionalUrl(),
  UDBUD_DK_PROD_TOKEN_URL: optionalUrl(),
  // --- mTLS / OCES3 (ERST-krav fra 31. januar 2027, sag #164788) ---
  // Når CLIENT_ID + CERT + KEY er sat, bruges mTLS-tokenflowet i stedet for Basic Auth.
  // CERT/KEY er base64-kodet PEM (se scripts/oces3-til-pem.ps1). Må ALDRIG committes.
  UDBUD_DK_CLIENT_ID: optionalStr(),
  UDBUD_DK_MTLS_CERT_B64: optionalStr(),
  UDBUD_DK_MTLS_KEY_B64: optionalStr(),
  UDBUD_DK_MTLS_KEY_PASSPHRASE: optionalStr(),
  // Ny tokenserver (ERST: tilgængelig fra ultimo sept. 2026). URL skal bekræftes af ERST.
  UDBUD_DK_PREPROD_MTLS_TOKEN_URL: optionalUrl(),
  UDBUD_DK_PROD_MTLS_TOKEN_URL: optionalUrl(),
  // @deprecated — erstattet af UDBUD_DK_PREPROD_API_URL og OIDC-flow; bevaret for at undgå opstartscrash
  UDBUD_DK_API_KEY: optionalStr(),
  // @deprecated — erstattet af UDBUD_DK_PREPROD_API_URL; bevaret for at undgå opstartscrash
  UDBUD_DK_PREPROD_URL: optionalUrl(),
  // @deprecated — erstattet af UDBUD_DK_PROD_API_URL; bevaret for at undgå opstartscrash
  UDBUD_DK_PROD_URL: optionalUrl(),
  // @deprecated — var aldrig i brug; bevaret for at undgå opstartscrash
  UDBUD_DK_DEMO_URL: optionalUrl(),

  // --- TED API v3 (EU Publications Office) ---
  TED_API_KEY: optionalStr(),
  TED_API_BASE_URL: optionalUrl(),
  TED_CLIENT_ID: optionalStr(),
  TED_CLIENT_SECRET: optionalStr(),
  EFORMS_SDK_VERSION: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .string()
      .regex(
        /^(eforms-sdk-dk-)?\d+\.\d+\.\d+(-\d+\.\d+\.\d+)?$/,
        'EFORMS_SDK_VERSION skal være enten semver (1.13.2), dansk SDK-format (1.13.0-1.3.0), eller fuldt ERST-format (eforms-sdk-dk-1.13.0-1.3.0)',
      )
      .optional(),
  ),

  // --- ESPD ---
  ESPD_API_BASE_URL: optionalUrl(),
  ESPD_API_KEY: optionalStr(),

  // --- AI-evaluering ---
  ANTHROPIC_API_KEY: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().regex(/^sk-ant-/, 'ANTHROPIC_API_KEY skal starte med "sk-ant-"').optional(),
  ),
  ANTHROPIC_MODEL: z.string().default('claude-opus-4-7'),
  OPENAI_API_KEY: optionalStr(),
  OPENAI_MODEL: z.string().default('gpt-4o'),

  // --- Email (Resend) ---
  RESEND_API_KEY: optionalStr(),
  EMAIL_FROM: z.string().default('noreply@mercurrytender.dk'),

  // --- Observability ---
  SENTRY_DSN: optionalUrl(),

  // --- Mercurry Tender (legacy, optional) ---
  BLOCKBID_BASE_URL: optionalStr(),
  BLOCKBID_EMAIL: optionalStr(),
  BLOCKBID_PASSWORD: optionalStr(),
})

// Skip validation on client side and edge runtime - use process.env directly
const serverEnv =
  isBrowser() || isEdge()
    ? (process.env as any)
    : serverSchema.parse(process.env)

/**
 * Struktureret, typestærk env-konfiguration.
 * Importér som: `import { env } from '@/config/env'`
 */
export const env = {
  runtime: {
    nodeEnv: serverEnv.NODE_ENV ?? 'development',
    logLevel: serverEnv.LOG_LEVEL ?? 'info',
    timezone: serverEnv.DEFAULT_TIMEZONE ?? 'Europe/Copenhagen',
    appUrl: serverEnv.NEXT_PUBLIC_APP_URL ?? 'https://mercurrytender.dk',
  },
  supabase: {
    url:
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      serverEnv.NEXT_PUBLIC_SUPABASE_URL ||
      '',
    anonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      '',
    serviceKey: serverEnv.SUPABASE_SERVICE_ROLE_KEY as string | undefined,
    region: serverEnv.SUPABASE_REGION as string | undefined,
  },
  udbudDk: {
    env: (serverEnv.UDBUD_DK_ENV ?? 'preprod') as 'preprod' | 'prod',
    basicUser: serverEnv.UDBUD_DK_BASIC_USER as string | undefined,
    basicPass: serverEnv.UDBUD_DK_BASIC_PASS as string | undefined,
    preprodApiUrl: serverEnv.UDBUD_DK_PREPROD_API_URL as string | undefined,
    prodApiUrl: serverEnv.UDBUD_DK_PROD_API_URL as string | undefined,
    preprodTokenUrl: serverEnv.UDBUD_DK_PREPROD_TOKEN_URL as string | undefined,
    prodTokenUrl: serverEnv.UDBUD_DK_PROD_TOKEN_URL as string | undefined,
    mtls: {
      clientId: serverEnv.UDBUD_DK_CLIENT_ID as string | undefined,
      certB64: serverEnv.UDBUD_DK_MTLS_CERT_B64 as string | undefined,
      keyB64: serverEnv.UDBUD_DK_MTLS_KEY_B64 as string | undefined,
      keyPassphrase: serverEnv.UDBUD_DK_MTLS_KEY_PASSPHRASE as string | undefined,
      preprodTokenUrl: serverEnv.UDBUD_DK_PREPROD_MTLS_TOKEN_URL as string | undefined,
      prodTokenUrl: serverEnv.UDBUD_DK_PROD_MTLS_TOKEN_URL as string | undefined,
    },
  },
  ted: {
    apiKey: serverEnv.TED_API_KEY as string | undefined,
    baseUrl: serverEnv.TED_API_BASE_URL as string | undefined,
    clientId: serverEnv.TED_CLIENT_ID as string | undefined,
    clientSecret: serverEnv.TED_CLIENT_SECRET as string | undefined,
    sdkVersion: serverEnv.EFORMS_SDK_VERSION as string | undefined,
  },
  espd: {
    baseUrl: serverEnv.ESPD_API_BASE_URL as string | undefined,
    apiKey: serverEnv.ESPD_API_KEY as string | undefined,
  },
  ai: {
    anthropic: {
      apiKey: serverEnv.ANTHROPIC_API_KEY as string | undefined,
      model: (serverEnv.ANTHROPIC_MODEL as string) ?? 'claude-opus-4-7',
    },
    openai: {
      apiKey: serverEnv.OPENAI_API_KEY as string | undefined,
      model: (serverEnv.OPENAI_MODEL as string) ?? 'gpt-4o',
    },
  },
  email: {
    resendApiKey: (serverEnv.RESEND_API_KEY as string) || '',
    from:
      (serverEnv.EMAIL_FROM as string) || 'noreply@mercurrytender.dk',
  },
  observability: {
    sentryDsn: serverEnv.SENTRY_DSN as string | undefined,
  },
  app: {
    baseUrl: serverEnv.NEXT_PUBLIC_APP_URL ?? 'https://mercurrytender.dk',
    timezone: (serverEnv.DEFAULT_TIMEZONE as string) || 'Europe/Copenhagen',
  },
}
