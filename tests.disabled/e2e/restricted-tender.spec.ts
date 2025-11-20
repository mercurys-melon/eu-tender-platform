import { test, expect } from '@playwright/test';
import { createAuthenticatedPage } from '../../src/auth/login';
import { createRestrictedTender } from '../../src/flows/restrictedTender';
import { RestrictedTenderInput } from '../../src/types';
import { dateUtils } from '../../src/utils/dates';

test.describe('Restricted Tender Creation', () => {
  test.skip('should create restricted tender successfully', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    const input: RestrictedTenderInput = {
      title: `Test Restricted Tender ${Date.now()}`,
      internalRef: `REF-REST-${Date.now()}`,
      cpv: ['12300000'],
      description: 'Test description for restricted tender',
      valueEstimate: 2000000,
      duration: { months: 18 },
      documents: [
        { path: './test-documents/prequalification.pdf', audience: 'all' }
      ],
      tildelingskriterier: [
        { name: 'Pris', type: 'price', weight: 70 },
        { name: 'Kvalitet', type: 'quality', weight: 30 }
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
      qaApplication: {
        qaDeadline: dateUtils.formatISO(dateUtils.addDaysAtNoon(5)),
        qaScope: 'application'
      },
      applicationDeadline: dateUtils.formatISO(dateUtils.addDaysAtNoon(10)),
      minInvite: 5,
      maxInvite: 8
    };

    // This test is skipped because it requires actual BlockBid access
    // await createRestrictedTender(page, input);
    
    // Verify tender was created
    // await expect(page.locator('text=Test Restricted Tender')).toBeVisible();
    
    await page.close();
  });

  test.skip('should process applications after deadline', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    const tenderTitle = 'Test Restricted Tender for Processing';
    
    // This test would process applications after the deadline
    // const flow = new RestrictedTenderFlow(page);
    // await flow.processApplicationsAfterDeadline(tenderTitle);
    
    // Verify applications were processed
    // await expect(page.locator('text=Prækvalificeret')).toBeVisible();
    
    await page.close();
  });

  test('should validate min/max invite constraints', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    // Navigate to create restricted tender
    await page.goto(`${page.url().replace(/\/[^\/]*$/, '')}/create`);
    
    // Select restricted procedure
    const restrictedRadio = page.locator('input[value="restricted"]');
    if (await restrictedRadio.isVisible()) {
      await restrictedRadio.click();
      
      // Set invalid min/max values
      const minInput = page.locator('input[name="minInvite"]');
      const maxInput = page.locator('input[name="maxInvite"]');
      
      if (await minInput.isVisible() && await maxInput.isVisible()) {
        await minInput.fill('10');
        await maxInput.fill('5'); // Invalid: max < min
        
        // Should show validation error
        await expect(page.locator('text=/maksimum.*minimum|max.*min/i')).toBeVisible();
      }
    }
    
    await page.close();
  });
});
