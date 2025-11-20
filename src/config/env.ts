import { config as loadEnv } from 'dotenv'
import { z } from 'zod'
import { isEdgeRuntime } from '@/lib/utils/runtime'

if (!isEdgeRuntime()) {
  loadEnv()
}

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_MAX_UPLOAD_MB: z.coerce.number().min(1).default(10),
  NEXT_PUBLIC_ANALYTICS_ENDPOINT: z.string().url().optional(),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
})

const serverEnvSchema = z
  .object({
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    BLOCKBID_BASE_URL: z.string().url(),
    BLOCKBID_EMAIL: z.string().email(),
    BLOCKBID_PASSWORD: z.string().min(1),
    DEFAULT_TIMEZONE: z.string().default('Europe/Copenhagen'),
    DEFAULT_LANG: z.string().default('da-DK'),
    ARTIFACTS_DIR: z.string().default('./artifacts'),
    PUBLISHING_MODE: z.enum(['ui', 'api', 'hybrid']).default('ui'),
    ESPD_API_BASE_URL: z.string().url().optional(),
    ESPD_API_KEY: z.string().optional(),
    TED_API_BASE_URL: z.string().url().optional(),
    TED_API_URL: z.string().url().optional(),
    TED_CLIENT_ID: z.string().optional(),
    TED_CLIENT_SECRET: z.string().optional(),
    ORGANIZATION_NAME: z.string().optional(),
    ORGANIZATION_ID: z.string().optional(),
    UDBUDDK_API_URL: z.string().url().optional(),
    UDBUDDK_API_KEY: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.PUBLISHING_MODE !== 'ui') {
      const requiredForApi: Array<[keyof typeof env, unknown]> = [
        ['ESPD_API_BASE_URL', env.ESPD_API_BASE_URL],
        ['TED_API_BASE_URL', env.TED_API_BASE_URL],
        ['TED_CLIENT_ID', env.TED_CLIENT_ID],
        ['TED_CLIENT_SECRET', env.TED_CLIENT_SECRET],
        ['ORGANIZATION_NAME', env.ORGANIZATION_NAME],
        ['ORGANIZATION_ID', env.ORGANIZATION_ID],
      ]

      requiredForApi
        .filter(([, value]) => !value)
        .forEach(([key]) => {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when PUBLISHING_MODE=${env.PUBLISHING_MODE}`,
          })
        })
    }
  })

const shouldValidate = !isEdgeRuntime()

export const clientEnv = shouldValidate ? clientEnvSchema.parse(process.env) : (process.env as unknown as z.infer<typeof clientEnvSchema>)
export const serverEnv = shouldValidate ? serverEnvSchema.parse(process.env) : (process.env as unknown as z.infer<typeof serverEnvSchema>)

export interface BlockBidConfig {
  baseUrl: string
  email: string
  password: string
  timezone: string
  language: string
  artifactsDir: string
  publishingMode: 'ui' | 'api' | 'hybrid'
  espdApiBaseUrl?: string
  espdApiKey?: string
  tedApiBaseUrl?: string
  tedClientId?: string
  tedClientSecret?: string
  organizationName?: string
  organizationId?: string
}

export const blockBidConfig: BlockBidConfig = {
  baseUrl: serverEnv.BLOCKBID_BASE_URL || 'https://blockbid.dk',
  email: serverEnv.BLOCKBID_EMAIL,
  password: serverEnv.BLOCKBID_PASSWORD,
  timezone: serverEnv.DEFAULT_TIMEZONE,
  language: serverEnv.DEFAULT_LANG,
  artifactsDir: serverEnv.ARTIFACTS_DIR,
  publishingMode: serverEnv.PUBLISHING_MODE,
  espdApiBaseUrl: serverEnv.ESPD_API_BASE_URL,
  espdApiKey: serverEnv.ESPD_API_KEY,
  tedApiBaseUrl: serverEnv.TED_API_BASE_URL,
  tedClientId: serverEnv.TED_CLIENT_ID,
  tedClientSecret: serverEnv.TED_CLIENT_SECRET,
  organizationName: serverEnv.ORGANIZATION_NAME,
  organizationId: serverEnv.ORGANIZATION_ID,
}

export function validateConfig(): void {
  if (!shouldValidate) {
    return
  }

  clientEnvSchema.parse(process.env)
  serverEnvSchema.parse(process.env)
}
