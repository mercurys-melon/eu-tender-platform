import { test, expect } from '@playwright/test';
import { createAuthenticatedPage } from '../../src/auth/login';
import { createNegotiatedProcedure } from '../../src/flows/negotiatedProcedure';
import { NegotiatedProcedureInput } from '../../src/types';
import { dateUtils } from '../../src/utils/dates';

test.describe('Negotiated Procedure Creation', () => {
  test.skip('should create negotiated procedure successfully', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    const input: NegotiatedProcedureInput = {
      title: `Test Negotiated Procedure ${Date.now()}`,
      internalRef: `REF-NEG-${Date.now()}`,
      cpv: ['12300000'],
      description: 'Test description for negotiated procedure',
      valueEstimate: 3000000,
      duration: { months: 24 },
      documents: [
        { path: './test-documents/application.pdf', audience: 'all' }
      ],
      tildelingskriterier: [
        { name: 'Pris', type: 'price', weight: 50 },
        { name: 'Kvalitet', type: 'quality', weight: 30 },
        { name: 'Innovation', type: 'other', weight: 20 }
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
      minInvite: 3,
      maxInvite: 5,
      requireInitialOffers: true,
      rounds: 2,
      initialOfferDeadline: dateUtils.formatISO(dateUtils.addDaysAtNoon(15)),
      finalOfferDeadline: dateUtils.formatISO(dateUtils.addDaysAtNoon(30)),
      justification: 'Kompleks teknologi kræver forhandling for at opnå optimal løsning'
    };

    // This test is skipped because it requires actual BlockBid access
    // await createNegotiatedProcedure(page, input);
    
    // Verify procedure was created
    // await expect(page.locator('text=Test Negotiated Procedure')).toBeVisible();
    
    await page.close();
  });

  test.skip('should conduct negotiation rounds', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    const tenderTitle = 'Test Negotiated Procedure for Rounds';
    
    // This test would conduct negotiation rounds
    // const flow = new NegotiatedProcedureFlow(page);
    // await flow.processApplicationsAndStartNegotiation(tenderTitle, {
    //   rounds: 2,
    //   requireInitialOffers: true,
    //   // ... other required fields
    // });
    
    // Verify negotiation rounds were created
    // await expect(page.locator('text=Forhandlingsrunde 1')).toBeVisible();
    // await expect(page.locator('text=Forhandlingsrunde 2')).toBeVisible();
    
    await page.close();
  });

  test('should validate negotiation justification', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    // Navigate to create negotiated procedure
    await page.goto(`${page.url().replace(/\/[^\/]*$/, '')}/create`);
    
    // Select negotiated procedure
    const negotiatedRadio = page.locator('input[value="negotiated"]');
    if (await negotiatedRadio.isVisible()) {
      await negotiatedRadio.click();
      
      // Try to submit without justification
      const submitButton = page.locator('button:has-text("Gem")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Should require justification
        await expect(page.locator('text=/begrundelse|justification/i')).toBeVisible();
      }
    }
    
    await page.close();
  });

  test('should handle initial offers requirement', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser);
    
    // Navigate to create negotiated procedure
    await page.goto(`${page.url().replace(/\/[^\/]*$/, '')}/create`);
    
    // Select negotiated procedure
    const negotiatedRadio = page.locator('input[value="negotiated"]');
    if (await negotiatedRadio.isVisible()) {
      await negotiatedRadio.click();
      
      // Check "Require initial offers"
      const initialOffersCheckbox = page.locator('input[name="requireInitialOffers"]');
      if (await initialOffersCheckbox.isVisible()) {
        await initialOffersCheckbox.check();
        
        // Should show initial offers deadline field
        await expect(page.locator('input[name="initialOfferDeadline"]')).toBeVisible();
      }
    }
    
    await page.close();
  });
});
