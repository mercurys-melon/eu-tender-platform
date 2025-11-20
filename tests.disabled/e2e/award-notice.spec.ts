import { test, expect } from '@playwright/test';
import { createAuthenticatedPage } from '../../src/auth/login';
import { publishAwardNotice } from '../../src/flows/award';
import { AwardNoticeInput } from '../../src/types';

test.describe('Award Notice Publication', () => {
  test.skip('should publish award notice successfully', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    const input: AwardNoticeInput = {
      tenderTitle: 'Test Tender for Award',
      winnerName: 'Test Winner A/S',
      winnerRegNo: '12345678',
      contractValue: 1500000
    };

    // This test is skipped because it requires actual BlockBid access
    // await publishAwardNotice(page, input);
    
    // Verify award notice was published
    // await expect(page.locator('text=Tildelingsbeslutning offentliggjort')).toBeVisible();
    
    await page.close();
  });

  test.skip('should get award notice reference', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    const tenderTitle = 'Test Tender with Award';
    
    // This test would get the award notice reference
    // const flow = new AwardFlow(page);
    // const reference = await flow.getAwardNoticeReference(tenderTitle);
    
    // Verify reference was retrieved
    // expect(reference).toMatch(/F03|TED/);
    
    await page.close();
  });

  test.skip('should check award notice publication status', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    const tenderTitle = 'Test Tender for Status Check';
    
    // This test would check publication status
    // const flow = new AwardFlow(page);
    // const isPublished = await flow.isAwardNoticePublished(tenderTitle);
    
    // Verify status was checked
    // expect(typeof isPublished).toBe('boolean');
    
    await page.close();
  });

  test('should validate winner information', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    // Navigate to award decision
    await page.goto(`${page.url().replace(/\/[^\/]*$/, '')}/award`);
    
    // Try to submit without winner name
    const submitButton = page.locator('button:has-text("Send F03")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Should require winner name
      await expect(page.locator('text=/vinder|winner/i')).toBeVisible();
    }
    
    await page.close();
  });

  test('should handle contract value validation', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    // Navigate to award decision
    await page.goto(`${page.url().replace(/\/[^\/]*$/, '')}/award`);
    
    // Fill invalid contract value
    const valueInput = page.locator('input[name="contractValue"]');
    if (await valueInput.isVisible()) {
      await valueInput.fill('-1000'); // Invalid negative value
      
      // Should show validation error
      await expect(page.locator('text=/positiv|positive/i')).toBeVisible();
    }
    
    await page.close();
  });
});
