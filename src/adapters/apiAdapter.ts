import { PublishingAdapter, ESPDPayload, ESPDResult, NoticePayload, NoticeResult, AwardPayload } from './publishing';
import { blockBidConfig } from '../config/env';
import { buildEspdJson, buildEspdWithXml } from '../lib/espd/builder';
import { espdApi } from '../api/espd';
import { buildEForms, buildF02Notice, buildF03Notice, buildF14Notice } from '../lib/eforms/builder';
import { eformsApi } from '../api/eforms';
import { BlockBidError } from '../utils/errors';

/**
 * API Adapter - Uses direct API calls for ESPD and eForms publishing
 */
export class ApiAdapter implements PublishingAdapter {
  /**
   * Create or attach ESPD via API
   */
  async createOrAttachESPD(input: ESPDPayload, ctx: { tenderTitle: string }): Promise<ESPDResult> {
    try {
      console.log('Creating ESPD via API...');
      
      // Build ESPD request with organization details
      const espdRequest = buildEspdJson({
        title: `ESPD for ${ctx.tenderTitle}`,
        buyer: { name: "Unknown Organization", identifier: "00000000" },
        preset: input.exclusionPreset || 'standardDK',
        criteria: input.selectionCriteria,
        specialConditions: input.specialConditions
      });

      // Create ESPD via API
      const result = await espdApi.create(espdRequest, { format: 'json' });

      return {
        id: result.id,
        version: 'api',
        downloadUrl: result.url,
        message: result.message || 'ESPD created via API'
      };
    } catch (error) {
      throw new BlockBidError(
        `ESPD API creation failed: ${error instanceof Error ? error.message : String(error)}`,
        'createOrAttachESPD'
      );
    }
  }

  /**
   * Submit notice to TED/eForms via API
   */
  async submitNotice(payload: NoticePayload): Promise<NoticeResult> {
    try {
      console.log(`Submitting ${payload.kind} notice via API...`);
      
      // Build eForms notice based on type
      let eformsNotice;
      
      switch (payload.kind) {
        case 'F02':
          eformsNotice = buildF02Notice({
            title: payload.title,
            description: payload.description,
            cpv: payload.cpv,
            buyer: { name: "Unknown Organization", identifier: "00000000" },
            procedure: payload.procedure as 'open' | 'restricted' | 'negotiated',
            lots: [{
              id: 'LOT-1',
              title: payload.title,
              description: payload.description,
              valueEstimate: payload.valueEstimate,
              duration: payload.duration
            }],
            deadlines: payload.deadlines,
            minInvite: payload.minInvite,
            maxInvite: payload.maxInvite,
            justification: payload.justification
          });
          break;
          
        case 'F03':
          eformsNotice = buildF03Notice({
            title: payload.title,
            description: payload.description,
            cpv: payload.cpv,
            buyer: { name: "Unknown Organization", identifier: "00000000" },
            winnerName: 'Winner Name', // This would come from the award payload
            contractValue: payload.valueEstimate,
            lots: [{
              id: 'LOT-1',
              title: payload.title,
              description: payload.description,
              valueEstimate: payload.valueEstimate
            }]
          });
          break;
          
        case 'F14':
          eformsNotice = buildF14Notice({
            title: payload.title,
            description: payload.description,
            cpv: payload.cpv,
            buyer: { name: "Unknown Organization", identifier: "00000000" },
            categories: ['General'], // This would come from the qualification system payload
            lots: [{
              id: 'LOT-1',
              title: payload.title,
              description: payload.description
            }]
          });
          break;
          
        default:
          throw new Error(`Unsupported notice type: ${payload.kind}`);
      }

      // Submit to eForms API
      const result = await eformsApi.submitNotice(eformsNotice);

      return {
        id: result.id,
        status: (result.status === 'processing' ? 'submitted' : result.status) as 'submitted' | 'accepted' | 'published' | 'failed',
        ojsId: result.ojsId,
        message: result.message || `${payload.kind} notice submitted via API`
      };
    } catch (error) {
      throw new BlockBidError(
        `eForms API submission failed: ${error instanceof Error ? error.message : String(error)}`,
        'submitNotice'
      );
    }
  }

  /**
   * Submit award notice via API
   */
  async submitAward(payload: AwardPayload): Promise<NoticeResult> {
    try {
      console.log('Submitting award notice via API...');
      
      // Submit award via eForms API
      const result = await eformsApi.submitAward({
        title: payload.tenderTitle,
        buyer: { name: "Unknown Organization", identifier: "00000000" },
        winnerName: payload.winnerName,
        winnerIdentifier: payload.winnerRegNo,
        contractValue: payload.contractValue
      });

      return {
        id: result.id,
        status: (result.status === 'processing' ? 'submitted' : result.status) as 'submitted' | 'accepted' | 'published' | 'failed',
        ojsId: result.ojsId,
        message: result.message || 'Award notice submitted via API'
      };
    } catch (error) {
      throw new BlockBidError(
        `Award API submission failed: ${error instanceof Error ? error.message : String(error)}`,
        'submitAward'
      );
    }
  }
}

