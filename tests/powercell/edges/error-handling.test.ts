/**
 * Edge Case Tests - Error Handling
 * Tests for error scenarios and edge cases
 */

import { TestRunner, TestSeverity } from '../core/test-runner'
import { HttpClient } from '../core/http-client'
import { assertEqual, assertTrue } from '../core/assertions'

const APP_URL = process.env.TEST_APP_URL || 'http://localhost:3000'

export default async function (runner: TestRunner) {
  const client = new HttpClient(APP_URL)

  await runner.runTest(
    'Edge: 404 page handles missing routes gracefully',
    'Minor',
    async () => {
      const response = await client.get('/non-existent-page-12345')
      // Should return 404, not 500
      assertTrue(
        response.status === 404 || response.status === 200, // Next.js might show custom 404 page
        'Missing routes should return 404 or show custom 404 page'
      )
    }
  )

  await runner.runTest(
    'Edge: API handles invalid tender ID format',
    'Minor',
    async () => {
      const response = await client.get('/api/tenders/invalid-id-format')
      // Should return 400/404, not 500
      assertTrue(
        response.status >= 400 && response.status < 500,
        'Invalid ID format should return 4xx error, not 5xx'
      )
    }
  )

  await runner.runTest(
    'Edge: API handles malformed requests',
    'Minor',
    async () => {
      const response = await client.post('/api/tenders', 'invalid json', {
        headers: { 'Content-Type': 'application/json' },
      })
      // Should return 400, not 500
      assertTrue(
        response.status === 400 || response.status === 422,
        'Malformed requests should return 4xx error, not 5xx'
      )
    }
  )

  await runner.runTest(
    'Edge: API handles missing authentication gracefully',
    'Major',
    async () => {
      const response = await client.get('/api/tenders')
      // Should return 401/403, not 500
      assertTrue(
        response.status === 401 || response.status === 403,
        'Unauthenticated requests should return 401/403, not 500'
      )
    }
  )
}
