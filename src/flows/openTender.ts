import { Page } from '@playwright/test';
import { SelectorHelper } from '../utils/selectors';
import { BlockBidError, withErrorHandling } from '../utils/errors';
import { SharedFlowHelpers } from './shared';
import { OpenTenderInput } from '../types';

export class OpenTenderFlow {
  private page: Page;
  private selectorHelper: SelectorHelper;
  private sharedHelpers: SharedFlowHelpers;

  constructor(page: Page) {
    this.page = page;
    this.selectorHelper = new SelectorHelper(page);
    this.sharedHelpers = new SharedFlowHelpers(page);
  }

  /**
   * Create an open tender (Offentligt udbud – EU, F02)
   */
  async createOpenTender(input: OpenTenderInput): Promise<void> {
    return withErrorHandling(async () => {
      console.log('Starting open tender creation...');

      // Check for existing tender with same title
      const uniqueTitle = await this.sharedHelpers.checkForExistingTender(input.title);

      // Navigate to create new tender
      await this.navigateToCreateTender();

      // Select "Offentligt udbud" procedure
      await this.selectOpenProcedure();

      // Fill basic tender information
      await this.sharedHelpers.fillBasicTenderInfo({
        ...input,
        title: uniqueTitle
      });

      // Fill tender notice (F02) specific information
      await this.fillF02Information(input);

      // Add award criteria
      await this.addAwardCriteria(input.tildelingskriterier);

      // Set communication preferences
      await this.setCommunicationPreferences();

      // Create or attach ESPD
      await this.sharedHelpers.createOrAttachESPD(input.espd);

      // Upload documents
      await this.sharedHelpers.uploadDocuments(input.documents);

      // Set QA deadlines
      await this.sharedHelpers.setQADeadlines(input.qa);

      // Set submission deadline
      await this.sharedHelpers.setSubmissionDeadline(input.deadlines);

      // Validate and publish to TED
      await this.sharedHelpers.validateAndPublishToTED();

      console.log('Open tender created successfully');
    }, 'createOpenTender', this.page);
  }

  /**
   * Navigate to create new tender page
   */
  private async navigateToCreateTender(): Promise<void> {
    const createButton = await this.selectorHelper.findButton('Opret nyt udbud');
    await createButton.click();
    await this.selectorHelper.waitForPageLoad();
  }

  /**
   * Select "Offentligt udbud" procedure
   */
  private async selectOpenProcedure(): Promise<void> {
    const openProcedureButton = await this.selectorHelper.find([
      { text: 'Offentligt udbud' },
      { role: 'radio', name: 'Offentligt udbud' },
      { xpath: '//input[@type="radio" and contains(@value, "open")]' }
    ]);

    await openProcedureButton.click();
    await this.selectorHelper.waitForPageLoad();
  }

  /**
   * Fill F02 (tender notice) specific information
   */
  private async fillF02Information(input: OpenTenderInput): Promise<void> {
    console.log('Filling F02 tender notice information...');

    // Ensure contracting authority details are prefilled (assume they are)
    // Choose procedure type
    const procedureSelect = await this.selectorHelper.findSelect('Procedure type');
    await procedureSelect.selectOption('Offentligt udbud');

    // Mark communication via platform
    const platformCommunicationCheckbox = await this.selectorHelper.findCheckbox('Kommunikation via platform');
    await platformCommunicationCheckbox.check();

    // Ensure "gratis og fuld adgang" (free and full access)
    const freeAccessCheckbox = await this.selectorHelper.findCheckbox('Gratis og fuld adgang');
    await freeAccessCheckbox.check();

    console.log('F02 information filled successfully');
  }

  /**
   * Add award criteria (tildelingskriterier)
   */
  private async addAwardCriteria(criteria: Array<{
    name: string;
    weight?: number;
    type: 'price' | 'quality' | 'cost' | 'other';
  }>): Promise<void> {
    console.log('Adding award criteria...');

    // Navigate to award criteria section
    const criteriaSection = await this.selectorHelper.find([
      { text: 'Tildelingskriterier' },
      { text: 'Award criteria' },
      { xpath: '//section[contains(@class, "criteria") or contains(@id, "criteria")]' }
    ]);

    await criteriaSection.click();
    await this.selectorHelper.waitForPageLoad();

    for (const criterion of criteria) {
      await this.addSingleCriterion(criterion);
    }

    console.log('All award criteria added successfully');
  }

  /**
   * Add a single award criterion
   */
  private async addSingleCriterion(criterion: {
    name: string;
    weight?: number;
    type: 'price' | 'quality' | 'cost' | 'other';
  }): Promise<void> {
    // Click "Add criterion" button
    const addButton = await this.selectorHelper.findButton('Tilføj kriterium');
    await addButton.click();

    // Fill criterion name
    const nameInput = await this.selectorHelper.findInput('Kriterienavn');
    await nameInput.fill(criterion.name);

    // Select criterion type
    const typeSelect = await this.selectorHelper.findSelect('Kriterietype');
    await typeSelect.selectOption(criterion.type);

    // Set weight if provided
    if (criterion.weight) {
      const weightInput = await this.selectorHelper.findInput('Vægt');
      await weightInput.fill(criterion.weight.toString());
    }

    // Save criterion
    const saveButton = await this.selectorHelper.findButton('Gem kriterium');
    await saveButton.click();

    console.log(`Added criterion: ${criterion.name} (${criterion.type})`);
  }

  /**
   * Set communication preferences
   */
  private async setCommunicationPreferences(): Promise<void> {
    console.log('Setting communication preferences...');

    // Navigate to communication section
    const communicationSection = await this.selectorHelper.find([
      { text: 'Kommunikation' },
      { text: 'Communication' },
      { xpath: '//section[contains(@class, "communication") or contains(@id, "communication")]' }
    ]);

    await communicationSection.click();
    await this.selectorHelper.waitForPageLoad();

    // Enable communication via platform
    const platformCheckbox = await this.selectorHelper.findCheckbox('Kommunikation via platform');
    await platformCheckbox.check();

    // Enable free and full access
    const freeAccessCheckbox = await this.selectorHelper.findCheckbox('Gratis og fuld adgang');
    await freeAccessCheckbox.check();

    console.log('Communication preferences set successfully');
  }
}

/**
 * Standalone function to create open tender
 */
export async function createOpenTender(page: Page, input: OpenTenderInput): Promise<void> {
  const flow = new OpenTenderFlow(page);
  await flow.createOpenTender(input);
}
