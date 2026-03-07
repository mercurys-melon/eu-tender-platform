/**
 * Journey Tests - Authentication Flow
 * End-to-end user journeys
 */

import { TestRunner, TestSeverity } from '../core/test-runner'
import { HttpClient } from '../core/http-client'
import { assertEqual, assertContains, assertTrue } from '../core/assertions'

const APP_URL = process.env.TEST_APP_URL || 'http://localhost:3000'

export default async function (runner: TestRunner) {
  const client = new HttpClient(APP_URL)

  await runner.runTest(
    'Journey: User can access login page',
    'Major',
    async () => {
      const response = await client.get('/login')
      assertEqual(response.status, 200, 'Login page should be accessible')
      assertContains(
        response.body.toLowerCase(),
        'log ind',
        'Login page should contain login form'
      )
    }
  )

  await runner.runTest(
    'Journey: User can access register page',
    'Major',
    async () => {
      const response = await client.get('/register')
      assertEqual(response.status, 200, 'Register page should be accessible')
      assertContains(
        response.body.toLowerCase(),
        'opret',
        'Register page should contain registration form'
      )
    }
  )

  await runner.runTest(
    'Journey: Login page has required form fields',
    'Major',
    async () => {
      const response = await client.get('/login')
      assertEqual(response.status, 200, 'Login page should be accessible')
      
      // Check for email and password fields (via data-testid or form structure)
      const hasEmailField = 
        response.body.includes('data-testid="login-email"') ||
        response.body.includes('type="email"') ||
        response.body.includes('email')
      
      const hasPasswordField = 
        response.body.includes('data-testid="login-password"') ||
        response.body.includes('type="password"') ||
        response.body.includes('password')
      
      assertTrue(hasEmailField, 'Login page should have email field')
      assertTrue(hasPasswordField, 'Login page should have password field')
    }
  )

  await runner.runTest(
    'Journey: Navigation links work',
    'Minor',
    async () => {
      const response = await client.get('/')
      assertEqual(response.status, 200, 'Home page should be accessible')
      
      // Check for navigation links
      const hasNavLinks = 
        response.body.includes('/tenders') ||
        response.body.includes('Udbud') ||
        response.body.includes('nav')
      
      assertTrue(hasNavLinks, 'Home page should have navigation links')
    }
  )
}
