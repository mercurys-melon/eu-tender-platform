import { test, expect } from '@playwright/test';
import { createAuthenticatedPage } from '../../src/auth/login';
import { blockBidConfig } from '../../src/config/env';

test.describe('Authentication', () => {
  test('should login successfully as contracting authority', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    // Verify we're on the dashboard or a logged-in page
    await expect(page).toHaveURL(/dashboard|mine-udbud/);
    
    // Check for user-specific elements
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    await page.close();
  });

  test('should handle invalid credentials', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to login page
    await page.goto(`${blockBidConfig.baseUrl}/login`);
    
    // Fill with invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Click login
    await page.click('button:has-text("Log ind")');
    
    // Should show error message
    await expect(page.locator('text=/forkert|invalid|error|fejl/i')).toBeVisible();
    
    await context.close();
  });

  test('should logout successfully', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    // Look for user menu and logout
    const userMenu = page.locator('button:has-text("Profil")').first();
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.click('text=Log ud');
      
      // Should redirect to login page
      await expect(page).toHaveURL(/login/);
    }
    
    await page.close();
  });
});
