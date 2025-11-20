import { Page } from '@playwright/test';
import { SelectorHelper } from '../utils/selectors';
import { BlockBidError, withErrorHandling } from '../utils/errors';
import { SharedFlowHelpers } from './shared';
import { RestrictedTenderInput } from '../types';
import { dateUtils } from '../utils/dates';

export class RestrictedTenderFlow {
  private page: Page;
  private selectorHelper: SelectorHelper;
  private sharedHelpers: SharedFlowHelpers;

  constructor(page: Page) {
    this.page = page;
    this.selectorHelper = new SelectorHelper(page);
    this.sharedHelpers = new SharedFlowHelpers(page);
  }

  /**
   * Create a restricted tender (Begrænset udbud – EU, F02)
   */
  async createRestrictedTender(input: RestrictedTenderInput): Promise<void> {
    return withErrorHandling(async () => {
      console.log('Starting restricted tender creation...');

      // Check for existing tender with same title
      const uniqueTitle = await this.sharedHelpers.checkForExistingTender(input.title);

      // Navigate to create new tender
      await this.navigateToCreateTender();

      // Select "Begrænset udbud" procedure
      await this.selectRestrictedProcedure();

      // Fill basic tender information
      await this.sharedHelpers.fillBasicTenderInfo({
        ...input,
        title: uniqueTitle
      });

      // Fill F02 specific information for restricted procedure
      await this.fillF02RestrictedInformation(input);

      // Add award criteria
      await this.addAwardCriteria(input.tildelingskriterier);

      // Set communication preferences
      await this.setCommunicationPreferences();

      // Create or attach ESPD
      await this.sharedHelpers.createOrAttachESPD(input.espd);

      // Upload documents for prequalification (audience 'all')
      const prequalificationDocs = input.documents.filter(doc => doc.audience === 'all');
      await this.sharedHelpers.uploadDocuments(prequalificationDocs);

      // Set QA deadlines for application
      await this.sharedHelpers.setQADeadlines(input.qaApplication);

      // Set application deadline
      await this.setApplicationDeadline(input.applicationDeadline);

      // Validate and publish to TED
      await this.sharedHelpers.validateAndPublishToTED();

      console.log('Restricted tender created successfully');
    }, 'createRestrictedTender', this.page);
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
   * Select "Begrænset udbud" procedure
   */
  private async selectRestrictedProcedure(): Promise<void> {
    const restrictedProcedureButton = await this.selectorHelper.find([
      { text: 'Begrænset udbud' },
      { role: 'radio', name: 'Begrænset udbud' },
      { xpath: '//input[@type="radio" and contains(@value, "restricted")]' }
    ]);

    await restrictedProcedureButton.click();
    await this.selectorHelper.waitForPageLoad();
  }

  /**
   * Fill F02 specific information for restricted procedure
   */
  private async fillF02RestrictedInformation(input: RestrictedTenderInput): Promise<void> {
    console.log('Filling F02 restricted tender information...');

    // Set min/max applicants
    if (input.minInvite) {
      const minInput = await this.selectorHelper.findInput('Minimum antal ansøgere');
      await minInput.fill(input.minInvite.toString());
    }

    if (input.maxInvite) {
      const maxInput = await this.selectorHelper.findInput('Maksimum antal ansøgere');
      await maxInput.fill(input.maxInvite.toString());
    }

    // Choose procedure type
    const procedureSelect = await this.selectorHelper.findSelect('Procedure type');
    await procedureSelect.selectOption('Begrænset udbud');

    // Mark communication via platform
    const platformCommunicationCheckbox = await this.selectorHelper.findCheckbox('Kommunikation via platform');
    await platformCommunicationCheckbox.check();

    // Enable ESPD
    const espdCheckbox = await this.selectorHelper.findCheckbox('Brug ESPD');
    await espdCheckbox.check();

    console.log('F02 restricted information filled successfully');
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

    console.log('Communication preferences set successfully');
  }

  /**
   * Set application deadline for prequalification
   */
  private async setApplicationDeadline(deadline: string): Promise<void> {
    console.log('Setting application deadline...');

    // Navigate to applications section
    const applicationsSection = await this.selectorHelper.find([
      { text: 'Ansøgninger' },
      { text: 'Applications' },
      { xpath: '//section[contains(@class, "applications") or contains(@id, "applications")]' }
    ]);

    await applicationsSection.click();
    await this.selectorHelper.waitForPageLoad();

    // Set application deadline
    const deadlineInput = await this.selectorHelper.findDateInput('Frist for ansøgning om prækvalifikation');
    const formattedDeadline = dateUtils.formatForUI(dateUtils.parseDate(deadline));
    await deadlineInput.fill(formattedDeadline);

    // Save deadline
    const saveButton = await this.selectorHelper.findButton('Gem ansøgningsfrist');
    await saveButton.click();

    console.log(`Application deadline set: ${formattedDeadline}`);
  }

  /**
   * Process applications after deadline (evaluate ESPD, select prequalified)
   */
  async processApplicationsAfterDeadline(tenderTitle: string): Promise<void> {
    return withErrorHandling(async () => {
      console.log('Processing applications after deadline...');

      // Navigate to tender
      await this.navigateToTender(tenderTitle);

      // Open applications section
      const applicationsSection = await this.selectorHelper.find([
        { text: 'Ansøgninger' },
        { text: 'Applications' },
        { xpath: '//section[contains(@class, "applications")]' }
      ]);

      await applicationsSection.click();
      await this.selectorHelper.waitForPageLoad();

      // Evaluate all applications
      await this.evaluateApplications();

      // Select prequalified suppliers
      await this.selectPrequalifiedSuppliers();

      // Send invitations to tender
      await this.sendInvitationsToTender();

      console.log('Applications processed successfully');
    }, 'processApplicationsAfterDeadline', this.page);
  }

  /**
   * Navigate to specific tender
   */
  private async navigateToTender(tenderTitle: string): Promise<void> {
    // Navigate to "Mine udbud"
    const myTendersLink = await this.selectorHelper.find([
      { text: 'Mine udbud' },
      { xpath: '//a[contains(@href, "/mine-udbud")]' }
    ]);

    await myTendersLink.click();
    await this.selectorHelper.waitForPageLoad();

    // Find and click on the tender
    const tenderLink = await this.selectorHelper.findByText(tenderTitle, 'a');
    await tenderLink.click();
    await this.selectorHelper.waitForPageLoad();
  }

  /**
   * Evaluate all submitted applications
   */
  private async evaluateApplications(): Promise<void> {
    console.log('Evaluating applications...');

    // Get all application rows
    const applicationRows = await this.page.locator('[data-testid="application-row"]').all();
    
    for (const row of applicationRows) {
      // Click evaluate button
      const evaluateButton = row.locator('button:has-text("Evaluer")');
      await evaluateButton.click();

      // Wait for evaluation form
      await this.selectorHelper.waitForPageLoad();

      // Fill evaluation (simplified - in real implementation, this would be more detailed)
      const scoreInput = await this.selectorHelper.findInput('Score');
      await scoreInput.fill('85'); // Example score

      const notesInput = await this.selectorHelper.findTextarea('Noter');
      await notesInput.fill('Godkendt baseret på ESPD');

      // Save evaluation
      const saveButton = await this.selectorHelper.findButton('Gem evaluering');
      await saveButton.click();

      console.log('Application evaluated');
    }
  }

  /**
   * Select prequalified suppliers
   */
  private async selectPrequalifiedSuppliers(): Promise<void> {
    console.log('Selecting prequalified suppliers...');

    // Select all applications that passed evaluation
    const selectAllButton = await this.selectorHelper.findButton('Vælg alle godkendte');
    await selectAllButton.click();

    // Mark as prequalified
    const prequalifyButton = await this.selectorHelper.findButton('Markér som prækvalificeret');
    await prequalifyButton.click();

    console.log('Suppliers marked as prequalified');
  }

  /**
   * Send invitations to tender
   */
  private async sendInvitationsToTender(): Promise<void> {
    console.log('Sending invitations to tender...');

    // Navigate to invitations section
    const invitationsSection = await this.selectorHelper.find([
      { text: 'Invitationer' },
      { text: 'Invitations' },
      { xpath: '//section[contains(@class, "invitations")]' }
    ]);

    await invitationsSection.click();
    await this.selectorHelper.waitForPageLoad();

    // Set tender QA deadline and submission deadline
    const qaDeadlineInput = await this.selectorHelper.findDateInput('QA frist for tilbud');
    const qaDeadline = dateUtils.formatForUI(dateUtils.addDaysAtNoon(14));
    await qaDeadlineInput.fill(qaDeadline);

    const submissionDeadlineInput = await this.selectorHelper.findDateInput('Indleveringsfrist for tilbud');
    const submissionDeadline = dateUtils.formatForUI(dateUtils.addDaysAtNoon(21));
    await submissionDeadlineInput.fill(submissionDeadline);

    // Upload final documents if needed
    // (This would be implemented based on specific requirements)

    // Send invitations
    const sendButton = await this.selectorHelper.findButton('Send invitationer');
    await sendButton.click();

    console.log('Invitations sent successfully');
  }
}

/**
 * Standalone function to create restricted tender
 */
export async function createRestrictedTender(page: Page, input: RestrictedTenderInput): Promise<void> {
  const flow = new RestrictedTenderFlow(page);
  await flow.createRestrictedTender(input);
}
