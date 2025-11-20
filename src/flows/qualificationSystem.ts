import { Page } from '@playwright/test';
import { SelectorHelper } from '../utils/selectors';
import { BlockBidError, withErrorHandling } from '../utils/errors';
import { SharedFlowHelpers } from './shared';
import { QualificationSystemInput } from '../types';

export class QualificationSystemFlow {
  private page: Page;
  private selectorHelper: SelectorHelper;
  private sharedHelpers: SharedFlowHelpers;

  constructor(page: Page) {
    this.page = page;
    this.selectorHelper = new SelectorHelper(page);
    this.sharedHelpers = new SharedFlowHelpers(page);
  }

  /**
   * Create a qualification system (Kvalifikationssystem – F14)
   */
  async createQualificationSystem(input: QualificationSystemInput): Promise<void> {
    return withErrorHandling(async () => {
      console.log('Starting qualification system creation...');

      // Check for existing system with same title
      const uniqueTitle = await this.sharedHelpers.checkForExistingTender(input.title);

      // Navigate to create new qualification system
      await this.navigateToCreateQualificationSystem();

      // Fill basic system information
      await this.fillBasicSystemInfo({
        ...input,
        title: uniqueTitle
      });

      // Fill F14 specific information
      await this.fillF14Information(input);

      // Set communication preferences
      await this.setCommunicationPreferences();

      // Create or attach ESPD
      await this.sharedHelpers.createOrAttachESPD(input.espd);

      // Upload rules/criteria documents
      await this.uploadRulesAndCriteria(input.documents);

      // Validate and publish to TED
      await this.sharedHelpers.validateAndPublishToTED();

      console.log('Qualification system created successfully');
    }, 'createQualificationSystem', this.page);
  }

  /**
   * Navigate to create new qualification system
   */
  private async navigateToCreateQualificationSystem(): Promise<void> {
    const createButton = await this.selectorHelper.findButton('Opret nyt kvalifikationssystem');
    await createButton.click();
    await this.selectorHelper.waitForPageLoad();
  }

  /**
   * Fill basic system information
   */
  private async fillBasicSystemInfo(input: {
    title: string;
    internalRef?: string;
    cpv: string[];
    description: string;
  }): Promise<void> {
    console.log('Filling basic system information...');

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

    console.log('Basic system information filled successfully');
  }

  /**
   * Fill F14 specific information
   */
  private async fillF14Information(input: QualificationSystemInput): Promise<void> {
    console.log('Filling F14 qualification system information...');

    // Set type to "Qualification system"
    const typeSelect = await this.selectorHelper.findSelect('System type');
    await typeSelect.selectOption('Kvalifikationssystem');

    // Add categories
    for (const category of input.categories) {
      const categoryInput = await this.selectorHelper.findInput('Kategori');
      await categoryInput.fill(category);
      
      const addButton = await this.selectorHelper.findButton('Tilføj kategori');
      await addButton.click();
    }

    // Set as "åbent løbende" (open-ended)
    const openEndedCheckbox = await this.selectorHelper.findCheckbox('Åbent løbende');
    await openEndedCheckbox.check();

    // Mark communication via platform
    const platformCommunicationCheckbox = await this.selectorHelper.findCheckbox('Kommunikation via platform');
    await platformCommunicationCheckbox.check();

    console.log('F14 information filled successfully');
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
   * Upload rules and criteria documents
   */
  private async uploadRulesAndCriteria(documents: Array<{
    path: string;
    audience: 'all' | 'prequalified' | 'invited';
  }>): Promise<void> {
    console.log('Uploading rules and criteria documents...');

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

    console.log('Rules and criteria documents uploaded successfully');
  }

  /**
   * Upload a single document
   */
  private async uploadSingleDocument(doc: {
    path: string;
    audience: 'all' | 'prequalified' | 'invited';
  }): Promise<void> {
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
   * Process applications continuously (accept, evaluate, mark as "Optaget/Afvist")
   */
  async processApplicationsContinuously(systemTitle: string): Promise<void> {
    return withErrorHandling(async () => {
      console.log('Processing applications continuously...');

      // Navigate to qualification system
      await this.navigateToQualificationSystem(systemTitle);

      // Open applications section
      const applicationsSection = await this.selectorHelper.find([
        { text: 'Ansøgninger' },
        { text: 'Applications' },
        { xpath: '//section[contains(@class, "applications")]' }
      ]);

      await applicationsSection.click();
      await this.selectorHelper.waitForPageLoad();

      // Get all pending applications
      const pendingApplications = await this.page.locator('[data-testid="pending-application"]').all();

      for (const application of pendingApplications) {
        await this.processSingleApplication(application);
      }

      console.log('All applications processed');
    }, 'processApplicationsContinuously', this.page);
  }

  /**
   * Navigate to specific qualification system
   */
  private async navigateToQualificationSystem(systemTitle: string): Promise<void> {
    // Navigate to "Mine udbud" or qualification systems
    const mySystemsLink = await this.selectorHelper.find([
      { text: 'Mine kvalifikationssystemer' },
      { text: 'Mine udbud' },
      { xpath: '//a[contains(@href, "/mine-udbud")]' }
    ]);

    await mySystemsLink.click();
    await this.selectorHelper.waitForPageLoad();

    // Find and click on the qualification system
    const systemLink = await this.selectorHelper.findByText(systemTitle, 'a');
    await systemLink.click();
    await this.selectorHelper.waitForPageLoad();
  }

  /**
   * Process a single application
   */
  private async processSingleApplication(application: any): Promise<void> {
    // Click on application to open details
    await application.click();
    await this.selectorHelper.waitForPageLoad();

    // Evaluate application (simplified)
    const evaluateButton = await this.selectorHelper.findButton('Evaluer ansøgning');
    await evaluateButton.click();

    // Fill evaluation form
    const scoreInput = await this.selectorHelper.findInput('Score');
    await scoreInput.fill('90'); // Example score

    const notesInput = await this.selectorHelper.findTextarea('Evaluering');
    await notesInput.fill('Godkendt baseret på ESPD og dokumentation');

    // Save evaluation
    const saveButton = await this.selectorHelper.findButton('Gem evaluering');
    await saveButton.click();

    // Mark as "Optaget" (Accepted) or "Afvist" (Rejected)
    const acceptButton = await this.selectorHelper.findButton('Optag');
    await acceptButton.click();

    // Send automated message
    const sendMessageButton = await this.selectorHelper.findButton('Send besked');
    await sendMessageButton.click();

    console.log('Application processed and marked as accepted');
  }

  /**
   * Create call-off tender under qualification system
   */
  async createCallOffTender(
    systemTitle: string,
    callOffInput: {
      title: string;
      description: string;
      documents: Array<{ path: string; audience: 'all' | 'prequalified' | 'invited' }>;
      qaDeadline: string;
      offerDeadline: string;
    }
  ): Promise<void> {
    return withErrorHandling(async () => {
      console.log('Creating call-off tender under qualification system...');

      // Navigate to qualification system
      await this.navigateToQualificationSystem(systemTitle);

      // Create "Udbud under kvalifikationssystem"
      const createCallOffButton = await this.selectorHelper.findButton('Opret udbud under kvalifikationssystem');
      await createCallOffButton.click();
      await this.selectorHelper.waitForPageLoad();

      // Fill call-off information
      const titleInput = await this.selectorHelper.findInput('Titel');
      await titleInput.fill(callOffInput.title);

      const descriptionInput = await this.selectorHelper.findTextarea('Beskrivelse');
      await descriptionInput.fill(callOffInput.description);

      // Choose qualified suppliers
      await this.chooseQualifiedSuppliers();

      // Upload call-off documents
      await this.uploadCallOffDocuments(callOffInput.documents);

      // Set QA and offer deadlines
      await this.setCallOffDeadlines(callOffInput.qaDeadline, callOffInput.offerDeadline);

      // Send invitations
      await this.sendCallOffInvitations();

      console.log('Call-off tender created successfully');
    }, 'createCallOffTender', this.page);
  }

  /**
   * Choose qualified suppliers for call-off
   */
  private async chooseQualifiedSuppliers(): Promise<void> {
    console.log('Choosing qualified suppliers...');

    // Navigate to suppliers section
    const suppliersSection = await this.selectorHelper.find([
      { text: 'Leverandører' },
      { text: 'Suppliers' },
      { xpath: '//section[contains(@class, "suppliers")]' }
    ]);

    await suppliersSection.click();
    await this.selectorHelper.waitForPageLoad();

    // Select all qualified suppliers
    const selectAllButton = await this.selectorHelper.findButton('Vælg alle kvalificerede');
    await selectAllButton.click();

    console.log('Qualified suppliers selected');
  }

  /**
   * Upload call-off documents
   */
  private async uploadCallOffDocuments(documents: Array<{
    path: string;
    audience: 'all' | 'prequalified' | 'invited';
  }>): Promise<void> {
    console.log('Uploading call-off documents...');

    // Navigate to documents section
    const documentsSection = await this.selectorHelper.find([
      { text: 'Dokumenter' },
      { text: 'Documents' },
      { xpath: '//section[contains(@class, "documents")]' }
    ]);

    await documentsSection.click();
    await this.selectorHelper.waitForPageLoad();

    for (const doc of documents) {
      await this.uploadSingleDocument(doc);
    }

    console.log('Call-off documents uploaded');
  }

  /**
   * Set call-off deadlines
   */
  private async setCallOffDeadlines(qaDeadline: string, offerDeadline: string): Promise<void> {
    console.log('Setting call-off deadlines...');

    // Navigate to deadlines section
    const deadlinesSection = await this.selectorHelper.find([
      { text: 'Frister' },
      { text: 'Deadlines' },
      { xpath: '//section[contains(@class, "deadlines")]' }
    ]);

    await deadlinesSection.click();
    await this.selectorHelper.waitForPageLoad();

    // Set QA deadline
    const qaDeadlineInput = await this.selectorHelper.findDateInput('QA frist');
    await qaDeadlineInput.fill(qaDeadline);

    // Set offer deadline
    const offerDeadlineInput = await this.selectorHelper.findDateInput('Tilbudsfrist');
    await offerDeadlineInput.fill(offerDeadline);

    // Save deadlines
    const saveButton = await this.selectorHelper.findButton('Gem frister');
    await saveButton.click();

    console.log('Call-off deadlines set');
  }

  /**
   * Send call-off invitations
   */
  private async sendCallOffInvitations(): Promise<void> {
    console.log('Sending call-off invitations...');

    // Navigate to invitations section
    const invitationsSection = await this.selectorHelper.find([
      { text: 'Invitationer' },
      { text: 'Invitations' },
      { xpath: '//section[contains(@class, "invitations")]' }
    ]);

    await invitationsSection.click();
    await this.selectorHelper.waitForPageLoad();

    // Send invitations
    const sendButton = await this.selectorHelper.findButton('Send invitationer');
    await sendButton.click();

    console.log('Call-off invitations sent');
  }
}

/**
 * Standalone function to create qualification system
 */
export async function createQualificationSystem(page: Page, input: QualificationSystemInput): Promise<void> {
  const flow = new QualificationSystemFlow(page);
  await flow.createQualificationSystem(input);
}
