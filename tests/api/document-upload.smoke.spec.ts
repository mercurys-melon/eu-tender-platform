import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { Buffer } from 'node:buffer'

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'TEST_SUPABASE_EMAIL',
  'TEST_SUPABASE_PASSWORD',
  'TEST_TENDER_ID',
]

const missingEnv = requiredEnvVars.filter((name) => !process.env[name])

if (missingEnv.length > 0) {
  test.skip(true, `Missing required env vars for smoke test: ${missingEnv.join(', ')}`)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const testEmail = process.env.TEST_SUPABASE_EMAIL!
const testPassword = process.env.TEST_SUPABASE_PASSWORD!
const testTenderId = process.env.TEST_TENDER_ID!

const appBaseUrl = process.env.TEST_APP_URL || 'http://localhost:3000'

function resolveProjectRef(url: string) {
  return new URL(url).hostname.split('.')[0]
}

test.describe('Document upload smoke', () => {
  test('uploads document and returns signed url', async ({ request }) => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    })

    if (error || !data.session) {
      throw error || new Error('Supabase session missing')
    }

    const projectRef = resolveProjectRef(supabaseUrl)
    const accessCookie = `sb-${projectRef}-access-token=${data.session.access_token}`
    const refreshCookie = `sb-${projectRef}-refresh-token=${data.session.refresh_token}`

    const response = await request.post(
      `${appBaseUrl}/api/tenders/${testTenderId}/documents/upload`,
      {
        headers: {
          Cookie: `${accessCookie}; ${refreshCookie}`,
        },
        multipart: {
          file: {
            name: 'smoke-upload.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('Smoke test payload'),
          },
        },
      }
    )

    expect(response.status()).toBe(201)

    const payload = await response.json()
    expect(payload).toMatchObject({
      id: expect.any(String),
      file_name: 'smoke-upload.txt',
      signed_url: expect.any(String),
    })
  })
})

