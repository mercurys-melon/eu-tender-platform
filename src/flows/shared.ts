import { Page } from '@playwright/test';
import { SelectorHelper } from '../utils/selectors';
import { BlockBidError, withErrorHandling } from '../utils/errors';
import { dateUtils } from '../utils/dates';
import { ESPDConfig, DocumentAudience, QAConfig, DeadlineConfig } from '../types';
import { existsSync } from 'fs';
import { join } from 'path';
import { PublishingStrategyFactory } from '../adapters/publishing';
import { blockBidConfig } from '../config/env';

export class SharedFlowHelpers {
  private page: Page;
  private selectorHelper: SelectorHelper;
  private publishingAdapter: any;

  constructor(page: Page) {
    this.page = page;
    this.selectorHelper = new SelectorHelper(page);
    this.publishingAdapter = PublishingStrategyFactory.createAdapter(blockBidConfig.publishingMode);
  }

  /**
   * Create or attach ESPD (European Single Procurement Document)
   */
  async createOrAttachESPD(config: ESPDConfig, tenderTitle?: string): Promise<void> {
    return withErrorHandling(async () => {
      if (!config.useESPD) {
        console.log('ESPD not required, skipping...');
        return;
      }

      console.log('Setting up ESPD...');

      // Use the publishing adapter to create ESPD
      const result = await this.publishingAdapter.createOrAttachESPD({
        exclusionPreset: config.exclusionGroundsPreset,
        selectionCriteria: config.selectionCriteria,
        specialConditions: config.specialConditions
      }, { tenderTitle: tenderTitle || 'Unknown Tender' });

      console.log(`ESPD created successfully: ${result.id} (${result.version})`);
      if (result.message) {
        console.log(result.message);
      }
    }, 'createOrAttachESPD', this.page);
  }

  /**
   * Add selection criteria to ESPD
   */
  private async addSelectionCriteria(criteria: { type: string; value: string }): Promise<void> {
    // Look for "Add criteria" button
    const addButton = await this.selectorHelper.findButton('Tilføj kriterium');
    await addButton.click();

    // Select criteria type
    const typeSelect = await this.selectorHelper.findSelect('Kriterietype');
    await typeSelect.selectOption(criteria.type);

    // Enter criteria value
    const valueInput = await this.selectorHelper.findInput('Kriteriebeskrivelse');
    await valueInput.fill(criteria.value);

    // Save criteria
    const saveButton = await this.selectorHelper.findButton('Gem kriterium');
    await saveButton.click();
  }

  /**
   * Add special conditions to ESPD
   */
  private async addSpecialConditions(conditions: string[]): Promise<void> {
    for (const condition of conditions) {
      const addButton = await this.selectorHelper.findButton('Tilføj særlig betingelse');
      await addButton.click();

      const conditionInput = await this.selectorHelper.findTextarea('Særlig betingelse');
      await conditionInput.fill(condition);

      const saveButton = await this.selectorHelper.findButton('Gem betingelse');
      await saveButton.click();
    }
  }

  /**
   * Upload documents with specified audience
   */
  async uploadDocuments(documents: Array<{ path: string; audience: DocumentAudience }>): Promise<void> {
    return withErrorHandling(async () => {
      console.log(`Uploading ${documents.length} documents...`);

      // Navigate to documents section
      const documentsSection = await this.selectorHelper.find([
        { text: 'Dokumenter' },
        { text: 'Documents' },
        { xpath: '//section[contains(@class, "documents") or contains(@id, "documents")]' }
      ]);

      await documentsSection.click();
      await this.selectorHelper.waitForPageLoad();

      for (const doc of documents) {
        await this.uploadSingleDocument(doc);
      }

      console.log('All documents uploaded successfully');
    }, 'uploadDocuments', this.page);
  }

  /**
   * Upload a single document
   */
  private async uploadSingleDocument(doc: { path: string; audience: DocumentAudience }): Promise<void> {
    // Verify file exists
    if (!existsSync(doc.path)) {
      throw new BlockBidError(
        `Document file not found: ${doc.path}`,
        'uploadSingleDocument',
        this.page
      );
    }

    // Click "Upload document" button
    const uploadButton = await this.selectorHelper.findButton('Upload dokument');
    await uploadButton.click();

    // Select file
    const fileInput = await this.selectorHelper.findFileInput();
    await fileInput.setInputFiles(doc.path);

    // Set audience
    const audienceSelect = await this.selectorHelper.findSelect('Synlighed');
    await audienceSelect.selectOption(doc.audience);

    // Save document
    const saveButton = await this.selectorHelper.findButton('Gem dokument');
    await saveButton.click();

    // Wait for upload to complete
    await this.selectorHelper.waitForElement(
      await this.selectorHelper.findByText('Uploadet', 'div')
    );

    console.log(`Document uploaded: ${doc.path} (audience: ${doc.audience})`);
  }

  /**
   * Set QA (Questions & Answers) deadlines
   */
  async setQADeadlines(config: QAConfig): Promise<void> {
    return withErrorHandling(async () => {
      console.log('Setting QA deadlines...');

      // Navigate to communication section
      const communicationSection = await this.selectorHelper.find([
        { text: 'Kommunikation' },
        { text: 'Communication' },
        { xpath: '//section[contains(@class, "communication") or contains(@id, "communication")]' }
      ]);

      await communicationSection.click();
      await this.selectorHelper.waitForPageLoad();

      // Set QA deadline
      const qaDeadlineInput = await this.selectorHelper.findDateInput('Spørgsmål og svar frist');
      const formattedDeadline = dateUtils.formatForUI(dateUtils.parseDate(config.qaDeadline));
      await qaDeadlineInput.fill(formattedDeadline);

      // Set QA scope
      const scopeSelect = await this.selectorHelper.findSelect('QA omfang');
      await scopeSelect.selectOption(config.qaScope);

      // Save QA settings
      const saveButton = await this.selectorHelper.findButton('Gem kommunikationsindstillinger');
      await saveButton.click();

      console.log(`QA deadline set: ${formattedDeadline} (scope: ${config.qaScope})`);
    }, 'setQADeadlines', this.page);
  }

  /**
   * Set submission deadline
   */
  async setSubmissionDeadline(config: DeadlineConfig): Promise<void> {
    return withErrorHandling(async () => {
      console.log('Setting submission deadline...');

      // Navigate to deadlines section
      const deadlinesSection = await this.selectorHelper.find([
        { text: 'Frister' },
        { text: 'Deadlines' },
        { xpath: '//section[contains(@class, "deadlines") or contains(@id, "deadlines")]' }
      ]);

      await deadlinesSection.click();
      await this.selectorHelper.waitForPageLoad();

      // Set submission deadline
      const deadlineInput = await this.selectorHelper.findDateInput('Indleveringsfrist');
      const formattedDeadline = dateUtils.formatForUI(dateUtils.parseDate(config.submissionDeadline));
      await deadlineInput.fill(formattedDeadline);

      // Set block late submissions if specified
      if (config.blockLateSubmissions !== undefined) {
        const blockCheckbox = await this.selectorHelper.findCheckbox('Blokér sene indleveringer');
        if (config.blockLateSubmissions) {
          await blockCheckbox.check();
        } else {
          await blockCheckbox.uncheck();
        }
      }

      // Save deadline settings
      const saveButton = await this.selectorHelper.findButton('Gem frister');
      await saveButton.click();

      console.log(`Submission deadline set: ${formattedDeadline}`);
    }, 'setSubmissionDeadline', this.page);
  }

  /**
   * Validate and publish to TED
   */
  async validateAndPublishToTED(noticePayload?: any): Promise<void> {
    return withErrorHandling(async () => {
      console.log('Validating and publishing to TED...');

      if (noticePayload) {
        // Use the publishing adapter to submit notice
        const result = await this.publishingAdapter.submitNotice(noticePayload);
        console.log(`Notice submitted successfully: ${result.id} (${result.status})`);
        if (result.message) {
          console.log(result.message);
        }
        if (result.ojsId) {
          console.log(`OJS ID: ${result.ojsId}`);
        }
      } else {
        // Fallback to UI-based publishing
        await this.publishViaUI();
      }
    }, 'validateAndPublishToTED', this.page);
  }

  /**
   * Publish via UI (fallback method)
   */
  private async publishViaUI(): Promise<void> {
    // Navigate to validation/summary section
    const validationSection = await this.selectorHelper.find([
      { text: 'Validering' },
      { text: 'Validation' },
      { text: 'Opsummering' },
      { text: 'Summary' },
      { xpath: '//section[contains(@class, "validation") or contains(@class, "summary")]' }
    ]);

    await validationSection.click();
    await this.selectorHelper.waitForPageLoad();

    // Click validate button
    const validateButton = await this.selectorHelper.findButton('Valider');
    await validateButton.click();

    // Wait for validation to complete
    await this.selectorHelper.waitForElement(
      await this.selectorHelper.findByText('Validering gennemført', 'div')
    );

    // Click "Send til TED" button
    const publishButton = await this.selectorHelper.findButton('Send til TED');
    await publishButton.click();

    // Confirm publication
    const confirmButton = await this.selectorHelper.findButton('Bekræft');
    await confirmButton.click();

    // Wait for publication to complete
    await this.waitForTEDPublication();

    console.log('Successfully published to TED via UI');
  }

  /**
   * Wait for TED publication to complete
   */
  private async waitForTEDPublication(): Promise<void> {
    const maxWaitTime = 60000; // 60 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Look for publication status indicators
        const statusIndicators = [
          { text: 'Offentliggjort' },
          { text: 'Published' },
          { text: 'TED reference' },
          { xpath: '//div[contains(@class, "status") and contains(text(), "Offentliggjort")]' }
        ];

        for (const indicator of statusIndicators) {
          if (await this.selectorHelper.exists([indicator])) {
            console.log('TED publication completed');
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
              `TED publication failed: ${errorText}`,
              'waitForTEDPublication',
              this.page
            );
          }
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        if (error instanceof BlockBidError) {
          throw error;
        }
        // Continue waiting
      }
    }

    throw new BlockBidError(
      'TED publication timeout - could not verify publication status',
      'waitForTEDPublication',
      this.page
    );
  }

  /**
   * Check if tender with same title already exists
   */
  async checkForExistingTender(title: string): Promise<string> {
    try {
      // Navigate to "Mine udbud" (My tenders)
      const myTendersLink = await this.selectorHelper.find([
        { text: 'Mine udbud' },
        { xpath: '//a[contains(@href, "/mine-udbud")]' }
      ]);

      await myTendersLink.click();
      await this.selectorHelper.waitForPageLoad();

      // Search for existing tender with same title
      const searchInput = await this.selectorHelper.findInput('Søg udbud');
      await searchInput.fill(title);

      const searchButton = await this.selectorHelper.findButton('Søg');
      await searchButton.click();

      // Check if any results match the title
      const existingTender = await this.selectorHelper.findByText(title, 'div');
      if (await existingTender.isVisible()) {
        // Generate unique title with suffix
        let counter = 1;
        let newTitle = `${title} (${counter})`;
        
        while (await this.selectorHelper.exists([{ text: newTitle }])) {
          counter++;
          newTitle = `${title} (${counter})`;
        }
        
        console.log(`Found existing tender with title "${title}", using "${newTitle}" instead`);
        return newTitle;
      }

      return title;
    } catch {
      // If search fails, return original title
      return title;
    }
  }

  /**
   * Fill basic tender information
   */
  async fillBasicTenderInfo(input: {
    title: string;
    internalRef?: string;
    cpv: string[];
    description: string;
    valueEstimate?: number;
    duration?: { months?: number; start?: string; end?: string };
  }): Promise<void> {
    return withErrorHandling(async () => {
      console.log('Filling basic tender information...');

      // Fill title
      const titleInput = await this.selectorHelper.findInput('Titel');
      await titleInput.fill(input.title);

      // Fill internal reference if provided
      if (input.internalRef) {
        const refInput = await this.selectorHelper.findInput('Internt referencenummer');
        await refInput.fill(input.internalRef);
      }

      // Add CPV codes
      for (const cpv of input.cpv) {
        const cpvInput = await this.selectorHelper.findInput('CPV kode');
        await cpvInput.fill(cpv);
        
        const addButton = await this.selectorHelper.findButton('Tilføj CPV');
        await addButton.click();
      }

      // Fill description
      const descriptionInput = await this.selectorHelper.findTextarea('Beskrivelse');
      await descriptionInput.fill(input.description);

      // Fill value estimate if provided
      if (input.valueEstimate) {
        const valueInput = await this.selectorHelper.findInput('Værdiansættelse');
        await valueInput.fill(input.valueEstimate.toString());
      }

      // Fill duration if provided
      if (input.duration) {
        if (input.duration.months) {
          const monthsInput = await this.selectorHelper.findInput('Varighed (måneder)');
          await monthsInput.fill(input.duration.months.toString());
        }

        if (input.duration.start) {
          const startInput = await this.selectorHelper.findDateInput('Startdato');
          const formattedStart = dateUtils.formatForUI(dateUtils.parseDate(input.duration.start));
          await startInput.fill(formattedStart);
        }

        if (input.duration.end) {
          const endInput = await this.selectorHelper.findDateInput('Slutdato');
          const formattedEnd = dateUtils.formatForUI(dateUtils.parseDate(input.duration.end));
          await endInput.fill(formattedEnd);
        }
      }

      console.log('Basic tender information filled successfully');
    }, 'fillBasicTenderInfo', this.page);
  }
}
