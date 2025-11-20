import { Page } from '@playwright/test';
import { SelectorHelper } from '../utils/selectors';
import { BlockBidError, withErrorHandling } from '../utils/errors';
import { SharedFlowHelpers } from './shared';
import { NegotiatedProcedureInput } from '../types';
import { dateUtils } from '../utils/dates';

export class NegotiatedProcedureFlow {
  private page: Page;
  private selectorHelper: SelectorHelper;
  private sharedHelpers: SharedFlowHelpers;

  constructor(page: Page) {
    this.page = page;
    this.selectorHelper = new SelectorHelper(page);
    this.sharedHelpers = new SharedFlowHelpers(page);
  }

  /**
   * Create a negotiated procedure (Udbud med forhandling – EU, F02)
   */
  async createNegotiatedProcedure(input: NegotiatedProcedureInput): Promise<void> {
    return withErrorHandling(async () => {
      console.log('Starting negotiated procedure creation...');

      // Check for existing tender with same title
      const uniqueTitle = await this.sharedHelpers.checkForExistingTender(input.title);

      // Navigate to create new tender
      await this.navigateToCreateTender();

      // Select "Udbud med forhandling" procedure
      await this.selectNegotiatedProcedure();

      // Fill basic tender information
      await this.sharedHelpers.fillBasicTenderInfo({
        ...input,
        title: uniqueTitle
      });

      // Fill F02 specific information for negotiated procedure
      await this.fillF02NegotiatedInformation(input);

      // Add award criteria
      await this.addAwardCriteria(input.tildelingskriterier);

      // Set communication preferences
      await this.setCommunicationPreferences();

      // Create or attach ESPD
      await this.sharedHelpers.createOrAttachESPD(input.espd);

      // Upload documents for application
      const applicationDocs = input.documents.filter(doc => doc.audience === 'all');
      await this.sharedHelpers.uploadDocuments(applicationDocs);

      // Set QA deadlines for application
      await this.sharedHelpers.setQADeadlines(input.qaApplication);

      // Set application deadline
      await this.setApplicationDeadline(input.applicationDeadline);

      // Validate and publish to TED
      await this.sharedHelpers.validateAndPublishToTED();

      console.log('Negotiated procedure created successfully');
    }, 'createNegotiatedProcedure', this.page);
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
   * Select "Udbud med forhandling" procedure
   */
  private async selectNegotiatedProcedure(): Promise<void> {
    const negotiatedProcedureButton = await this.selectorHelper.find([
      { text: 'Udbud med forhandling' },
      { role: 'radio', name: 'Udbud med forhandling' },
      { xpath: '//input[@type="radio" and contains(@value, "negotiated")]' }
    ]);

    await negotiatedProcedureButton.click();
    await this.selectorHelper.waitForPageLoad();
  }

  /**
   * Fill F02 specific information for negotiated procedure
   */
  private async fillF02NegotiatedInformation(input: NegotiatedProcedureInput): Promise<void> {
    console.log('Filling F02 negotiated procedure information...');

    // Add justification for negotiation
    if (input.justification) {
      const justificationInput = await this.selectorHelper.findTextarea('Begrundelse for forhandling');
      await justificationInput.fill(input.justification);
    }

    // Set min/max invite
    if (input.minInvite) {
      const minInput = await this.selectorHelper.findInput('Minimum antal inviterede');
      await minInput.fill(input.minInvite.toString());
    }

    if (input.maxInvite) {
      const maxInput = await this.selectorHelper.findInput('Maksimum antal inviterede');
      await maxInput.fill(input.maxInvite.toString());
    }

    // Choose procedure type
    const procedureSelect = await this.selectorHelper.findSelect('Procedure type');
    await procedureSelect.selectOption('Udbud med forhandling');

    // Mark initial offers if required
    if (input.requireInitialOffers) {
      const initialOffersCheckbox = await this.selectorHelper.findCheckbox('Kræv indledende tilbud');
      await initialOffersCheckbox.check();
    }

    // Mark communication via platform
    const platformCommunicationCheckbox = await this.selectorHelper.findCheckbox('Kommunikation via platform');
    await platformCommunicationCheckbox.check();

    // Enable ESPD
    const espdCheckbox = await this.selectorHelper.findCheckbox('Brug ESPD');
    await espdCheckbox.check();

    console.log('F02 negotiated information filled successfully');
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
   * Set application deadline
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
    const deadlineInput = await this.selectorHelper.findDateInput('Frist for ansøgning');
    const formattedDeadline = dateUtils.formatForUI(dateUtils.parseDate(deadline));
    await deadlineInput.fill(formattedDeadline);

    // Save deadline
    const saveButton = await this.selectorHelper.findButton('Gem ansøgningsfrist');
    await saveButton.click();

    console.log(`Application deadline set: ${formattedDeadline}`);
  }

  /**
   * Process applications after deadline and start negotiation rounds
   */
  async processApplicationsAndStartNegotiation(
    tenderTitle: string,
    input: NegotiatedProcedureInput
  ): Promise<void> {
    return withErrorHandling(async () => {
      console.log('Processing applications and starting negotiation...');

      // Navigate to tender
      await this.navigateToTender(tenderTitle);

      // Process applications (similar to restricted procedure)
      await this.processApplications();

      // Send initial offers invitation if required
      if (input.requireInitialOffers && input.initialOfferDeadline) {
        await this.sendInitialOffersInvitation(input.initialOfferDeadline);
      }

      // Set QA for tender if provided
      if (input.qaTender) {
        await this.sharedHelpers.setQADeadlines(input.qaTender);
      }

      // Start negotiation rounds
      if (input.rounds && input.rounds > 0) {
        await this.conductNegotiationRounds(input.rounds);
      }

      // Request final offers
      if (input.finalOfferDeadline) {
        await this.requestFinalOffers(input.finalOfferDeadline);
      }

      console.log('Negotiation process completed successfully');
    }, 'processApplicationsAndStartNegotiation', this.page);
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
   * Process applications (evaluate and select prequalified)
   */
  private async processApplications(): Promise<void> {
    console.log('Processing applications...');

    // Open applications section
    const applicationsSection = await this.selectorHelper.find([
      { text: 'Ansøgninger' },
      { text: 'Applications' },
      { xpath: '//section[contains(@class, "applications")]' }
    ]);

    await applicationsSection.click();
    await this.selectorHelper.waitForPageLoad();

    // Evaluate applications (simplified)
    const evaluateAllButton = await this.selectorHelper.findButton('Evaluer alle ansøgninger');
    await evaluateAllButton.click();

    // Select prequalified suppliers
    const selectPrequalifiedButton = await this.selectorHelper.findButton('Vælg prækvalificerede');
    await selectPrequalifiedButton.click();

    console.log('Applications processed');
  }

  /**
   * Send initial offers invitation
   */
  private async sendInitialOffersInvitation(deadline: string): Promise<void> {
    console.log('Sending initial offers invitation...');

    // Navigate to invitations section
    const invitationsSection = await this.selectorHelper.find([
      { text: 'Invitationer' },
      { text: 'Invitations' },
      { xpath: '//section[contains(@class, "invitations")]' }
    ]);

    await invitationsSection.click();
    await this.selectorHelper.waitForPageLoad();

    // Create "Indledende tilbud" invitation
    const createInvitationButton = await this.selectorHelper.findButton('Opret invitation');
    await createInvitationButton.click();

    // Set invitation type
    const typeSelect = await this.selectorHelper.findSelect('Invitation type');
    await typeSelect.selectOption('Indledende tilbud');

    // Set deadline
    const deadlineInput = await this.selectorHelper.findDateInput('Frist for indledende tilbud');
    const formattedDeadline = dateUtils.formatForUI(dateUtils.parseDate(deadline));
    await deadlineInput.fill(formattedDeadline);

    // Send invitation
    const sendButton = await this.selectorHelper.findButton('Send invitation');
    await sendButton.click();

    console.log('Initial offers invitation sent');
  }

  /**
   * Conduct negotiation rounds
   */
  private async conductNegotiationRounds(rounds: number): Promise<void> {
    console.log(`Conducting ${rounds} negotiation rounds...`);

    for (let i = 1; i <= rounds; i++) {
      await this.createNegotiationRound(i);
    }

    console.log('All negotiation rounds completed');
  }

  /**
   * Create a single negotiation round
   */
  private async createNegotiationRound(roundNumber: number): Promise<void> {
    console.log(`Creating negotiation round ${roundNumber}...`);

    // Navigate to negotiation section
    const negotiationSection = await this.selectorHelper.find([
      { text: 'Forhandling' },
      { text: 'Negotiation' },
      { xpath: '//section[contains(@class, "negotiation")]' }
    ]);

    await negotiationSection.click();
    await this.selectorHelper.waitForPageLoad();

    // Create new round
    const createRoundButton = await this.selectorHelper.findButton('Opret forhandlingsrunde');
    await createRoundButton.click();

    // Set round number
    const roundInput = await this.selectorHelper.findInput('Runde nummer');
    await roundInput.fill(roundNumber.toString());

    // Set deadline for this round
    const deadlineInput = await this.selectorHelper.findDateInput('Frist for forhandlingstilbud');
    const deadline = dateUtils.formatForUI(dateUtils.addDaysAtNoon(7 * roundNumber));
    await deadlineInput.fill(deadline);

    // Upload revised documents if needed (optional)
    // This would be implemented based on specific requirements

    // Invite participants (default: all prequalified)
    const inviteAllButton = await this.selectorHelper.findButton('Inviter alle deltagere');
    await inviteAllButton.click();

    // Save round
    const saveButton = await this.selectorHelper.findButton('Gem forhandlingsrunde');
    await saveButton.click();

    console.log(`Negotiation round ${roundNumber} created`);
  }

  /**
   * Request final offers
   */
  private async requestFinalOffers(deadline: string): Promise<void> {
    console.log('Requesting final offers...');

    // Navigate to final offers section
    const finalOffersSection = await this.selectorHelper.find([
      { text: 'Endelige tilbud' },
      { text: 'Final offers' },
      { xpath: '//section[contains(@class, "final-offers")]' }
    ]);

    await finalOffersSection.click();
    await this.selectorHelper.waitForPageLoad();

    // Create final offers request
    const createRequestButton = await this.selectorHelper.findButton('Anmod om endelige tilbud');
    await createRequestButton.click();

    // Set deadline
    const deadlineInput = await this.selectorHelper.findDateInput('Frist for endelige tilbud');
    const formattedDeadline = dateUtils.formatForUI(dateUtils.parseDate(deadline));
    await deadlineInput.fill(formattedDeadline);

    // Send request
    const sendButton = await this.selectorHelper.findButton('Send anmodning');
    await sendButton.click();

    console.log('Final offers request sent');
  }
}

/**
 * Standalone function to create negotiated procedure
 */
export async function createNegotiatedProcedure(page: Page, input: NegotiatedProcedureInput): Promise<void> {
  const flow = new NegotiatedProcedureFlow(page);
  await flow.createNegotiatedProcedure(input);
}
