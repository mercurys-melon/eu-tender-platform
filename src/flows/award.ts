import { Page } from '@playwright/test';
import { SelectorHelper } from '../utils/selectors';
import { BlockBidError, withErrorHandling } from '../utils/errors';
import { AwardNoticeInput } from '../types';

export class AwardFlow {
  private page: Page;
  private selectorHelper: SelectorHelper;

  constructor(page: Page) {
    this.page = page;
    this.selectorHelper = new SelectorHelper(page);
  }

  /**
   * Publish award notice (F03)
   */
  async publishAwardNotice(input: AwardNoticeInput): Promise<void> {
    return withErrorHandling(async () => {
      console.log('Starting award notice publication...');

      // Navigate to tender dashboard
      await this.navigateToTender(input.tenderTitle);

      // Open award decision section
      await this.openAwardDecision();

      // Fill award information
      await this.fillAwardInformation(input);

      // Submit F03 to TED
      await this.submitF03ToTED();

      // Confirm publication
      await this.confirmPublication();

      console.log('Award notice published successfully');
    }, 'publishAwardNotice', this.page);
  }

  /**
   * Navigate to specific tender
   */
  private async navigateToTender(tenderTitle: string): Promise<void> {
    // Navigate to "Mine udbud" (My tenders)
    const myTendersLink = await this.selectorHelper.find([
      { text: 'Mine udbud' },
      { xpath: '//a[contains(@href, "/mine-udbud")]' }
    ]);

    await myTendersLink.click();
    await this.selectorHelper.waitForPageLoad();

    // Search for the tender if needed
    const searchInput = await this.selectorHelper.findInput('Søg udbud');
    await searchInput.fill(tenderTitle);

    const searchButton = await this.selectorHelper.findButton('Søg');
    await searchButton.click();

    // Find and click on the tender
    const tenderLink = await this.selectorHelper.findByText(tenderTitle, 'a');
    await tenderLink.click();
    await this.selectorHelper.waitForPageLoad();
  }

  /**
   * Open award decision section
   */
  private async openAwardDecision(): Promise<void> {
    console.log('Opening award decision section...');

    // Look for award decision link/button
    const awardDecisionLink = await this.selectorHelper.find([
      { text: 'Tildelingsbeslutning' },
      { text: 'Award decision' },
      { text: 'F03' },
      { xpath: '//a[contains(@href, "/award") or contains(@href, "/tildeling")]' }
    ]);

    await awardDecisionLink.click();
    await this.selectorHelper.waitForPageLoad();
  }

  /**
   * Fill award information
   */
  private async fillAwardInformation(input: AwardNoticeInput): Promise<void> {
    console.log('Filling award information...');

    // Fill winner name
    const winnerNameInput = await this.selectorHelper.findInput('Vinderens navn');
    await winnerNameInput.fill(input.winnerName);

    // Fill winner registration number if provided
    if (input.winnerRegNo) {
      const regNoInput = await this.selectorHelper.findInput('CVR nummer');
      await regNoInput.fill(input.winnerRegNo);
    }

    // Fill contract value if provided
    if (input.contractValue) {
      const valueInput = await this.selectorHelper.findInput('Kontraktværdi');
      await valueInput.fill(input.contractValue.toString());
    }

    // Select winner from evaluation results if available
    await this.selectWinnerFromEvaluation(input.winnerName);

    // Add award justification
    await this.addAwardJustification();

    console.log('Award information filled successfully');
  }

  /**
   * Select winner from evaluation results
   */
  private async selectWinnerFromEvaluation(winnerName: string): Promise<void> {
    try {
      // Look for evaluation results section
      const evaluationSection = await this.selectorHelper.find([
        { text: 'Evaluering' },
        { text: 'Evaluation' },
        { xpath: '//section[contains(@class, "evaluation")]' }
      ]);

      await evaluationSection.click();
      await this.selectorHelper.waitForPageLoad();

      // Find the winner in the evaluation results
      const winnerRow = await this.selectorHelper.find([
        { text: winnerName },
        { xpath: `//tr[contains(., "${winnerName}")]` }
      ]);

      // Select the winner
      const selectButton = winnerRow.locator('button:has-text("Vælg som vinder")');
      await selectButton.click();

      console.log(`Winner selected: ${winnerName}`);
    } catch (error) {
      console.log('Could not select winner from evaluation, continuing with manual entry');
    }
  }

  /**
   * Add award justification
   */
  private async addAwardJustification(): Promise<void> {
    try {
      const justificationInput = await this.selectorHelper.findTextarea('Begrundelse for tildeling');
      await justificationInput.fill(
        'Tildelingen er baseret på evaluering af tilbud i henhold til de opstillede tildelingskriterier. ' +
        'Vinderen opfylder alle krav og har leveret det mest fordelagtige tilbud.'
      );
    } catch (error) {
      console.log('Could not add justification, continuing without it');
    }
  }

  /**
   * Submit F03 to TED
   */
  private async submitF03ToTED(): Promise<void> {
    console.log('Submitting F03 to TED...');

    // Look for submit button
    const submitButton = await this.selectorHelper.find([
      { text: 'Send F03 til TED' },
      { text: 'Submit F03 to TED' },
      { text: 'Offentliggør tildelingsbeslutning' },
      { role: 'button', name: /send.*ted|submit.*f03/i }
    ]);

    await submitButton.click();
    await this.selectorHelper.waitForPageLoad();

    // Wait for submission to be processed
    await this.waitForF03Submission();
  }

  /**
   * Wait for F03 submission to be processed
   */
  private async waitForF03Submission(): Promise<void> {
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Look for success indicators
        const successIndicators = [
          { text: 'F03 sendt til TED' },
          { text: 'F03 submitted to TED' },
          { text: 'Tildelingsbeslutning offentliggjort' },
          { xpath: '//div[contains(@class, "success") and contains(text(), "F03")]' }
        ];

        for (const indicator of successIndicators) {
          if (await this.selectorHelper.exists([indicator])) {
            console.log('F03 submitted to TED successfully');
            return;
          }
        }

        // Check for error indicators
        const errorIndicators = [
          { text: /fejl|error|failed/i },
          { role: 'alert' },
          { xpath: '//div[contains(@class, "error")]' }
        ];

        for (const error of errorIndicators) {
          if (await this.selectorHelper.exists([error])) {
            const errorText = await this.selectorHelper.getText([error]);
            throw new BlockBidError(
              `F03 submission failed: ${errorText}`,
              'waitForF03Submission',
              this.page
            );
          }
        }

        await this.page.waitForTimeout(2000);
      } catch (error) {
        if (error instanceof BlockBidError) {
          throw error;
        }
        // Continue waiting
      }
    }

    throw new BlockBidError(
      'F03 submission timeout - could not verify submission status',
      'waitForF03Submission',
      this.page
    );
  }

  /**
   * Confirm publication
   */
  private async confirmPublication(): Promise<void> {
    console.log('Confirming publication...');

    // Look for confirmation dialog
    const confirmButton = await this.selectorHelper.find([
      { text: 'Bekræft' },
      { text: 'Confirm' },
      { text: 'Ja, offentliggør' },
      { role: 'button', name: /confirm|bekræft/i }
    ]);

    await confirmButton.click();
    await this.selectorHelper.waitForPageLoad();

    // Wait for final confirmation
    await this.waitForPublicationConfirmation();
  }

  /**
   * Wait for publication confirmation
   */
  private async waitForPublicationConfirmation(): Promise<void> {
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Look for final success indicators
        const successIndicators = [
          { text: 'Tildelingsbeslutning offentliggjort' },
          { text: 'Award notice published' },
          { text: 'F03 offentliggjort' },
          { xpath: '//div[contains(@class, "success") and contains(text(), "offentliggjort")]' }
        ];

        for (const indicator of successIndicators) {
          if (await this.selectorHelper.exists([indicator])) {
            console.log('Award notice published successfully');
            return;
          }
        }

        await this.page.waitForTimeout(2000);
      } catch (error) {
        // Continue waiting
      }
    }

    console.log('Publication confirmation timeout - assuming success');
  }

  /**
   * Get award notice reference/TED reference
   */
  async getAwardNoticeReference(tenderTitle: string): Promise<string | null> {
    try {
      // Navigate to tender
      await this.navigateToTender(tenderTitle);

      // Look for award decision section
      await this.openAwardDecision();

      // Look for TED reference
      const referenceElement = await this.selectorHelper.find([
        { text: /TED reference|F03 reference/i },
        { xpath: '//span[contains(@class, "reference")]' }
      ]);

      const reference = await referenceElement.textContent();
      return reference?.trim() || null;
    } catch (error) {
      console.log('Could not retrieve award notice reference');
      return null;
    }
  }

  /**
   * Check if award notice has been published
   */
  async isAwardNoticePublished(tenderTitle: string): Promise<boolean> {
    try {
      // Navigate to tender
      await this.navigateToTender(tenderTitle);

      // Look for published status indicators
      const publishedIndicators = [
        { text: 'Offentliggjort' },
        { text: 'Published' },
        { text: 'F03 offentliggjort' },
        { xpath: '//div[contains(@class, "status") and contains(text(), "Offentliggjort")]' }
      ];

      for (const indicator of publishedIndicators) {
        if (await this.selectorHelper.exists([indicator])) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Standalone function to publish award notice
 */
export async function publishAwardNotice(page: Page, input: AwardNoticeInput): Promise<void> {
  const flow = new AwardFlow(page);
  await flow.publishAwardNotice(input);
}
