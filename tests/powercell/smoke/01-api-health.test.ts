/**
 * Smoke Tests - API Health Checks
 * Critical path tests that must pass
 */

import { TestRunner, TestSeverity } from '../core/test-runner'
import { HttpClient } from '../core/http-client'
import { assertEqual, assertTrue } from '../core/assertions'

const APP_URL = process.env.TEST_APP_URL || 'http://localhost:3000'

export default async function (runner: TestRunner) {
  const client = new HttpClient(APP_URL)

  await runner.runTest(
    'API health check - root endpoint',
    'Blocker',
    async () => {
      const response = await client.get('/')
      assertTrue(response.status === 200 || response.status === 404, 'Root endpoint should respond')
    }
  )

  await runner.runTest(
    'API health check - API routes exist',
    'Blocker',
    async () => {
      const response = await client.get('/api/tenders')
      // Should return 200 (with auth) or 401/403 (without auth), but not 404
      assertTrue(
        response.status !== 404,
        'API routes should exist (404 indicates missing routes)'
      )
    }
  )

  await runner.runTest(
    'API health check - static assets',
    'Minor',
    async () => {
      const response = await client.get('/favicon.ico')
      // 200 or 404 is acceptable for favicon
      assertTrue(
        response.status === 200 || response.status === 404,
        'Static assets should be accessible'
      )
    }
  )
}
