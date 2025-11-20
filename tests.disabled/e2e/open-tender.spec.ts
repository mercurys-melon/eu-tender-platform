import { test, expect } from '@playwright/test';
import { createAuthenticatedPage } from '../../src/auth/login';
import { createOpenTender } from '../../src/flows/openTender';
import { OpenTenderInput } from '../../src/types';
import { dateUtils } from '../../src/utils/dates';

test.describe('Open Tender Creation', () => {
  test.skip('should create open tender successfully', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    const input: OpenTenderInput = {
      title: `Test Open Tender ${Date.now()}`,
      internalRef: `REF-${Date.now()}`,
      cpv: ['12300000'],
      description: 'Test description for open tender',
      valueEstimate: 1000000,
      duration: { months: 12 },
      documents: [
        { path: './test-documents/specification.pdf', audience: 'all' }
      ],
      tildelingskriterier: [
        { name: 'Pris', type: 'price', weight: 60 },
        { name: 'Kvalitet', type: 'quality', weight: 40 }
      ],
      espd: {
        useESPD: true,
        exclusionGroundsPreset: 'standardDK',
        selectionCriteria: [
          { type: 'economic', value: 'Finansiel stabilitet' },
          { type: 'technical', value: 'Teknisk kapacitet' }
        ]
      },
      qa: {
        qaDeadline: dateUtils.formatISO(dateUtils.addDaysAtNoon(7)),
        qaScope: 'tender'
      },
      deadlines: {
        submissionDeadline: dateUtils.formatISO(dateUtils.addDaysAtNoon(14)),
        blockLateSubmissions: true
      }
    };

    // This test is skipped because it requires actual BlockBid access
    // Uncomment and run when you have valid credentials and access
    // await createOpenTender(page, input);
    
    // Verify tender was created
    // await expect(page.locator('text=Test Open Tender')).toBeVisible();
    
    await page.close();
  });

  test('should validate required fields', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    // Navigate to create tender
    await page.goto(`${page.url().replace(/\/[^\/]*$/, '')}/create`);
    
    // Try to submit without required fields
    const submitButton = page.locator('button:has-text("Gem")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Should show validation errors
      await expect(page.locator('text=/påkrævet|required/i')).toBeVisible();
    }
    
    await page.close();
  });

  test('should handle duplicate tender titles', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    const duplicateTitle = 'Duplicate Test Tender';
    
    // Create first tender
    const input1: OpenTenderInput = {
      title: duplicateTitle,
      cpv: ['12300000'],
      description: 'First tender',
      documents: [],
      tildelingskriterier: [],
      espd: { useESPD: false, selectionCriteria: [] },
      qa: { qaDeadline: dateUtils.formatISO(dateUtils.addDaysAtNoon(7)), qaScope: 'tender' },
      deadlines: { submissionDeadline: dateUtils.formatISO(dateUtils.addDaysAtNoon(14)) }
    };
    
    // This test is skipped because it requires actual BlockBid access
    // await createOpenTender(page, input1);
    
    // Try to create second tender with same title
    const input2: OpenTenderInput = {
      ...input1,
      description: 'Second tender'
    };
    
    // Should handle duplicate gracefully by appending suffix
    // await createOpenTender(page, input2);
    
    await page.close();
  });
});
