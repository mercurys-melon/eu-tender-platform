import { Page } from '@playwright/test';
import { PublishingAdapter, ESPDPayload, ESPDResult, NoticePayload, NoticeResult, AwardPayload } from './publishing';
import { SharedFlowHelpers } from '../flows/shared';
import { BlockBidError, withErrorHandling } from '../utils/errors';

/**
 * UI Adapter - Uses BlockBid UI for ESPD and TED publishing
 */
export class UiAdapter implements PublishingAdapter {
  private page: Page;
  private sharedHelpers: SharedFlowHelpers;

  constructor(page: Page) {
    this.page = page;
    this.sharedHelpers = new SharedFlowHelpers(page);
  }

  /**
   * Create or attach ESPD using BlockBid UI
   */
  async createOrAttachESPD(input: ESPDPayload, ctx: { tenderTitle: string }): Promise<ESPDResult> {
    return withErrorHandling(async () => {
      console.log('Creating ESPD via BlockBid UI...');
      
      // Use the existing shared helper for ESPD creation
      await this.sharedHelpers.createOrAttachESPD({
        useESPD: true,
        exclusionGroundsPreset: input.exclusionPreset || 'standardDK',
        selectionCriteria: input.selectionCriteria,
        specialConditions: input.specialConditions
      });

      // In UI mode, we don't get an ID back, so we use a placeholder
      return {
        id: `ui-espd-${Date.now()}`,
        version: 'ui',
        message: 'ESPD created via BlockBid UI'
      };
    }, 'createOrAttachESPD', this.page);
  }

  /**
   * Submit notice to TED using BlockBid UI
   */
  async submitNotice(payload: NoticePayload): Promise<NoticeResult> {
    return withErrorHandling(async () => {
      console.log(`Submitting ${payload.kind} notice via BlockBid UI...`);
      
      // Use the existing shared helper for TED publishing
      await this.sharedHelpers.validateAndPublishToTED();

      // In UI mode, we don't get a real ID back, so we use a placeholder
      return {
        id: `ui-notice-${Date.now()}`,
        status: 'submitted',
        message: `${payload.kind} notice submitted via BlockBid UI`
      };
    }, 'submitNotice', this.page);
  }

  /**
   * Submit award notice using BlockBid UI
   */
  async submitAward(payload: AwardPayload): Promise<NoticeResult> {
    return withErrorHandling(async () => {
      console.log('Submitting award notice via BlockBid UI...');
      
      // Navigate to award section and submit
      // This would use the existing award flow
      const { publishAwardNotice } = await import('../flows/award');
      await publishAwardNotice(this.page, {
        tenderTitle: payload.tenderTitle,
        winnerName: payload.winnerName,
        winnerRegNo: payload.winnerRegNo,
        contractValue: payload.contractValue
      });

      return {
        id: `ui-award-${Date.now()}`,
        status: 'submitted',
        message: 'Award notice submitted via BlockBid UI'
      };
    }, 'submitAward', this.page);
  }
}
