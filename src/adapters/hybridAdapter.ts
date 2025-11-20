import { Page } from '@playwright/test';
import { PublishingAdapter, ESPDPayload, ESPDResult, NoticePayload, NoticeResult, AwardPayload } from './publishing';
import { ApiAdapter } from './apiAdapter';
import { UiAdapter } from './uiAdapter';
import { BlockBidError } from '../utils/errors';

/**
 * Hybrid Adapter - Tries API first, falls back to UI if API fails
 */
export class HybridAdapter implements PublishingAdapter {
  private apiAdapter: ApiAdapter;
  private uiAdapter: UiAdapter;

  constructor(page: Page) {
    this.apiAdapter = new ApiAdapter();
    this.uiAdapter = new UiAdapter(page);
  }

  /**
   * Create or attach ESPD - try API first, fallback to UI
   */
  async createOrAttachESPD(input: ESPDPayload, ctx: { tenderTitle: string }): Promise<ESPDResult> {
    try {
      console.log('Attempting ESPD creation via API...');
      const result = await this.apiAdapter.createOrAttachESPD(input, ctx);
      console.log('✅ ESPD created successfully via API');
      return result;
    } catch (apiError) {
      console.warn('⚠️  ESPD API creation failed, falling back to UI:', apiError instanceof Error ? apiError.message : String(apiError));
      
      try {
        const result = await this.uiAdapter.createOrAttachESPD(input, ctx);
        console.log('✅ ESPD created successfully via UI fallback');
        return {
          ...result,
          message: `${result.message} (API fallback)`
        };
      } catch (uiError) {
        throw new BlockBidError(
          `Both API and UI ESPD creation failed. API error: ${apiError instanceof Error ? apiError.message : String(apiError)}. UI error: ${uiError instanceof Error ? uiError.message : String(uiError)}`,
          'createOrAttachESPD'
        );
      }
    }
  }

  /**
   * Submit notice - try API first, fallback to UI
   */
  async submitNotice(payload: NoticePayload): Promise<NoticeResult> {
    try {
      console.log(`Attempting ${payload.kind} notice submission via API...`);
      const result = await this.apiAdapter.submitNotice(payload);
      console.log(`✅ ${payload.kind} notice submitted successfully via API`);
      return result;
    } catch (apiError) {
      console.warn(`⚠️  ${payload.kind} notice API submission failed, falling back to UI:`, apiError instanceof Error ? apiError.message : String(apiError));
      
      try {
        const result = await this.uiAdapter.submitNotice(payload);
        console.log(`✅ ${payload.kind} notice submitted successfully via UI fallback`);
        return {
          ...result,
          message: `${result.message} (API fallback)`
        };
      } catch (uiError) {
        throw new BlockBidError(
          `Both API and UI notice submission failed. API error: ${apiError instanceof Error ? apiError.message : String(apiError)}. UI error: ${uiError instanceof Error ? uiError.message : String(uiError)}`,
          'submitNotice'
        );
      }
    }
  }

  /**
   * Submit award notice - try API first, fallback to UI
   */
  async submitAward(payload: AwardPayload): Promise<NoticeResult> {
    try {
      console.log('Attempting award notice submission via API...');
      const result = await this.apiAdapter.submitAward(payload);
      console.log('✅ Award notice submitted successfully via API');
      return result;
    } catch (apiError) {
      console.warn('⚠️  Award notice API submission failed, falling back to UI:', apiError instanceof Error ? apiError.message : String(apiError));
      
      try {
        const result = await this.uiAdapter.submitAward(payload);
        console.log('✅ Award notice submitted successfully via UI fallback');
        return {
          ...result,
          message: `${result.message} (API fallback)`
        };
      } catch (uiError) {
        throw new BlockBidError(
          `Both API and UI award submission failed. API error: ${apiError instanceof Error ? apiError.message : String(apiError)}. UI error: ${uiError instanceof Error ? uiError.message : String(uiError)}`,
          'submitAward'
        );
      }
    }
  }
}
