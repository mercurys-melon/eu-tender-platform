import { z } from 'zod'

const isEdge = () => typeof (globalThis as any).EdgeRuntime !== 'undefined'
const isBrowser = () => typeof window !== 'undefined'

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // service role er påkrævet på server, men vi skipper Zod-throw i Edge runtime
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  BLOCKBID_BASE_URL: z.string().url().optional(),
  BLOCKBID_EMAIL: z.string().email().optional(),
  BLOCKBID_PASSWORD: z.string().min(1).optional(),
  DEFAULT_TIMEZONE: z.string().default('Europe/Copenhagen'),
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
}
