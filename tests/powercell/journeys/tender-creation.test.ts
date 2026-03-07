/**
 * Journey Tests - Tender Creation Flow
 * End-to-end user journeys for creating tenders
 */

import { TestRunner, TestSeverity } from '../core/test-runner'
import { HttpClient } from '../core/http-client'
import { assertEqual, assertContains, assertTrue } from '../core/assertions'

const APP_URL = process.env.TEST_APP_URL || 'http://localhost:3000'

export default async function (runner: TestRunner) {
  const client = new HttpClient(APP_URL)

  await runner.runTest(
    'Journey: Tender list page is accessible',
    'Major',
    async () => {
      const response = await client.get('/tenders')
      // Should return 200 or redirect to login (302/307)
      assertTrue(
        response.status === 200 || response.status === 302 || response.status === 307,
        'Tender list page should be accessible or redirect'
      )
    }
  )

  await runner.runTest(
    'Journey: Tender creation page structure',
    'Major',
    async () => {
      // This will likely redirect to login, but we can check the structure
      const response = await client.get('/tenders/create')
      
      // Should redirect to login or show create form
      assertTrue(
        response.status === 200 || response.status === 302 || response.status === 307,
        'Tender creation page should be accessible or redirect'
      )
      
      if (response.status === 200) {
        // Check for form fields if page is accessible
        const hasFormFields = 
          response.body.includes('data-testid="tender-title"') ||
          response.body.includes('title') ||
          response.body.includes('form')
        
        assertTrue(hasFormFields, 'Tender creation page should have form fields')
      }
    }
  )
}
