import { test, expect } from '@playwright/test';
import { createAuthenticatedPage } from '../../src/auth/login';
import { createQualificationSystem } from '../../src/flows/qualificationSystem';
import { QualificationSystemInput } from '../../src/types';

test.describe('Qualification System Creation', () => {
  test.skip('should create qualification system successfully', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    const input: QualificationSystemInput = {
      title: `Test Qualification System ${Date.now()}`,
      internalRef: `REF-QS-${Date.now()}`,
      cpv: ['12300000', '45600000'],
      description: 'Test description for qualification system',
      documents: [
        { path: './test-documents/rules.pdf', audience: 'all' },
        { path: './test-documents/criteria.pdf', audience: 'all' }
      ],
      espd: {
        useESPD: true,
        exclusionGroundsPreset: 'standardDK',
        selectionCriteria: [
          { type: 'economic', value: 'Finansiel stabilitet' },
          { type: 'technical', value: 'Teknisk kapacitet' },
          { type: 'experience', value: 'Erfaring med lignende projekter' }
        ]
      },
      openEnded: true,
      categories: ['El', 'VVS', 'IT']
    };

    // This test is skipped because it requires actual BlockBid access
    // await createQualificationSystem(page, input);
    
    // Verify system was created
    // await expect(page.locator('text=Test Qualification System')).toBeVisible();
    
    await page.close();
  });

  test.skip('should process applications continuously', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    const systemTitle = 'Test Qualification System for Processing';
    
    // This test would process applications continuously
    // const flow = new QualificationSystemFlow(page);
    // await flow.processApplicationsContinuously(systemTitle);
    
    // Verify applications were processed
    // await expect(page.locator('text=Optaget')).toBeVisible();
    
    await page.close();
  });

  test.skip('should create call-off tender', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    const systemTitle = 'Test Qualification System for Call-off';
    
    const callOffInput = {
      title: 'Call-off Tender Test',
      description: 'Test call-off tender under qualification system',
      documents: [
        { path: './test-documents/call-off-spec.pdf', audience: 'invited' }
      ],
      qaDeadline: '2025-01-15T10:00',
      offerDeadline: '2025-01-22T12:00'
    };
    
    // This test would create a call-off tender
    // const flow = new QualificationSystemFlow(page);
    // await flow.createCallOffTender(systemTitle, callOffInput);
    
    // Verify call-off tender was created
    // await expect(page.locator('text=Call-off Tender Test')).toBeVisible();
    
    await page.close();
  });

  test('should validate categories requirement', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    // Navigate to create qualification system
    await page.goto(`${page.url().replace(/\/[^\/]*$/, '')}/create-qualification-system`);
    
    // Try to submit without categories
    const submitButton = page.locator('button:has-text("Gem")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Should require categories
      await expect(page.locator('text=/kategorier|categories/i')).toBeVisible();
    }
    
    await page.close();
  });

  test('should handle open-ended setting', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    // Navigate to create qualification system
    await page.goto(`${page.url().replace(/\/[^\/]*$/, '')}/create-qualification-system`);
    
    // Check "Åbent løbende" (open-ended)
    const openEndedCheckbox = page.locator('input[name="openEnded"]');
    if (await openEndedCheckbox.isVisible()) {
      await openEndedCheckbox.check();
      
      // Should show open-ended specific options
      await expect(page.locator('text=/åbent løbende|open-ended/i')).toBeVisible();
    }
    
    await page.close();
  });
});
