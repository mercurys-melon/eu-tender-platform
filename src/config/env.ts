import { z } from 'zod'

const isEdge = () => typeof (globalThis as any).EdgeRuntime !== 'undefined'
const isBrowser = () => typeof window !== 'undefined'

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // service role er påkrævet på server, men vi skipper Zod-throw i Edge runtime
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  BLOCKBID_BASE_URL: z.string().optional(),
  BLOCKBID_EMAIL: z.string().optional(),
  BLOCKBID_PASSWORD: z.string().optional(),
  DEFAULT_TIMEZONE: z.string().default('Europe/Copenhagen'),
  // Email — required in production, optional in development
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@mercurrytender.dk'),
})

// Skip validation on client side and edge runtime - use process.env directly
const serverEnv = (isBrowser() || isEdge()) 
  ? (process.env as any) 
  : serverSchema.parse(process.env)

export const env = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || serverEnv.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceKey: serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  },
  app: {
    baseUrl: serverEnv.BLOCKBID_BASE_URL || 'https://blockbid.dk',
    email: serverEnv.BLOCKBID_EMAIL || '',
    password: serverEnv.BLOCKBID_PASSWORD || '',
    timezone: serverEnv.DEFAULT_TIMEZONE || 'Europe/Copenhagen',
  },
  email: {
    resendApiKey: serverEnv.RESEND_API_KEY || '',
    from: serverEnv.EMAIL_FROM || 'noreply@mercurrytender.dk',
  },
}

// Compatibility export
export const blockBidConfig = {
  baseUrl: env.app.baseUrl,
  email: env.app.email,
  password: env.app.password,
  timezone: env.app.timezone,
  language: 'da-DK',
  artifactsDir: './artifacts',
  publishingMode: 'ui' as const,
  tedApiBaseUrl: process.env.TED_API_BASE_URL || '',
  tedClientId: process.env.TED_CLIENT_ID,
  tedClientSecret: process.env.TED_CLIENT_SECRET,
  espdApiBaseUrl: process.env.ESPD_API_BASE_URL || '',
  espdApiKey: process.env.ESPD_API_KEY,
}
