/**
 * Edge Case Tests - Performance
 * Tests for performance characteristics
 */

import { TestRunner, TestSeverity } from '../core/test-runner'
import { HttpClient } from '../core/http-client'
import { assertTrue } from '../core/assertions'

const APP_URL = process.env.TEST_APP_URL || 'http://localhost:3000'
const MAX_RESPONSE_TIME = 5000 // 5 seconds

export default async function (runner: TestRunner) {
  const client = new HttpClient(APP_URL)

  await runner.runTest(
    'Edge: Home page loads within acceptable time',
    'Minor',
    async (ctx) => {
      const startTime = Date.now()
      const response = await client.get('/', { timeout: MAX_RESPONSE_TIME })
      const duration = Date.now() - startTime
      
      assertTrue(
        duration < MAX_RESPONSE_TIME,
        `Home page should load within ${MAX_RESPONSE_TIME}ms, took ${duration}ms`
      )
      
      ctx.metadata.responseTime = duration
      ctx.metadata.status = response.status
    }
  )

  await runner.runTest(
    'Edge: Login page loads within acceptable time',
    'Minor',
    async (ctx) => {
      const startTime = Date.now()
      const response = await client.get('/login', { timeout: MAX_RESPONSE_TIME })
      const duration = Date.now() - startTime
      
      assertTrue(
        duration < MAX_RESPONSE_TIME,
        `Login page should load within ${MAX_RESPONSE_TIME}ms, took ${duration}ms`
      )
      
      ctx.metadata.responseTime = duration
      ctx.metadata.status = response.status
    }
  )
}
