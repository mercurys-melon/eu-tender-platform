/**
 * Env-konfiguration for eu-tender-platform (Next.js).
 *
 * - Server-side (Node.js): validerer med zod og fejler hårdt ved manglende required vars.
 * - Edge runtime + browser: bruger process.env direkte (kun NEXT_PUBLIC_* er tilgængeligt).
 *
 * Jf. CLAUDE.md sessionsstart-checklist pkt. 1.
 *
 * Nye felter (ift. v1): TED-udvidelse, Udbud.dk, ESPD, Anthropic, OpenAI,
 * Sentry, Supabase-region, runtime-felter. Bagudkompatibelt: 'env.supabase.*',
 * 'env.app.*', 'env.email.*' og 'blockBidConfig' bevares.
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
  // Bruges af src/lib/publication/service.ts - dokumenteret virke mod PREPROD
  UDBUD_DK_API_KEY: optionalStr(),
  UDBUD_DK_PREPROD_URL: optionalUrl(),
  UDBUD_DK_PROD_URL: optionalUrl(),
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
      .regex(/^\d+\.\d+\.\d+$/, 'EFORMS_SDK_VERSION skal følge semver-format, fx 1.13.2')
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

  // --- BlockBid (legacy, optional) ---
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
    apiKey: serverEnv.UDBUD_DK_API_KEY as string | undefined,
    preprodUrl: serverEnv.UDBUD_DK_PREPROD_URL as string | undefined,
    prodUrl: serverEnv.UDBUD_DK_PROD_URL as string | undefined,
    demoUrl: serverEnv.UDBUD_DK_DEMO_URL as string | undefined,
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
  // Bevaret for bagudkompatibilitet med blockBidConfig
  app: {
    baseUrl:
      (serverEnv.BLOCKBID_BASE_URL as string) || 'https://blockbid.dk',
    email: (serverEnv.BLOCKBID_EMAIL as string) || '',
    password: (serverEnv.BLOCKBID_PASSWORD as string) || '',
    timezone:
      (serverEnv.DEFAULT_TIMEZONE as string) || 'Europe/Copenhagen',
  },
}

/**
 * Compatibility export - BEVARET fra v1.
 * Hvis dine eksisterende scripts importerer `blockBidConfig`, virker de uændret.
 * Nye integrationer bør importere `env` direkte.
 */
export const blockBidConfig = {
  baseUrl: env.app.baseUrl,
  email: env.app.email,
  password: env.app.password,
  timezone: env.app.timezone,
  language: 'da-DK',
  artifactsDir: './artifacts',
  publishingMode: 'ui' as const,
  tedApiBaseUrl: env.ted.baseUrl || '',
  tedClientId: env.ted.clientId,
  tedClientSecret: env.ted.clientSecret,
  espdApiBaseUrl: env.espd.baseUrl || '',
  espdApiKey: env.espd.apiKey,
}
