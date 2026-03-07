import { UiAdapter } from './uiAdapter';
import { ApiAdapter } from './apiAdapter';
import { HybridAdapter } from './hybridAdapter';
/**
 * Publishing Adapter Interface
 * Defines the contract for different publishing strategies (UI, API, Hybrid)
 */

export interface ESPDPayload {
  exclusionPreset?: 'standardDK' | 'standardEU' | 'custom';
  selectionCriteria: Array<{
    type: 'economic' | 'technical' | 'experience' | 'other';
    value: string;
  }>;
  specialConditions?: string[];
}

export interface ESPDResult {
  id: string;
  version: 'ui' | 'api';
  downloadUrl?: string;
  message?: string;
}

export interface NoticePayload {
  kind: 'F02' | 'F03' | 'F14';
  title: string;
  description?: string;
  cpv: string[];
  procedure: 'open' | 'restricted' | 'negotiated' | 'qualification';
  minInvite?: number;
  maxInvite?: number;
  justification?: string;
  valueEstimate?: number;
  duration?: { months?: number; start?: string; end?: string };
  deadlines?: {
    application?: string;
    qaApplication?: string;
    tender?: string;
    qaTender?: string;
  };
  accessIsFree?: boolean;
  communicationChannel?: string;
}

export interface NoticeResult {
  id: string;
  status: 'submitted' | 'accepted' | 'published' | 'failed';
  ojsId?: string;
  message?: string;
}

export interface AwardPayload {
  tenderTitle: string;
  winnerName: string;
  winnerRegNo?: string;
  contractValue?: number;
}

/**
 * Publishing Adapter Interface
 */
export interface PublishingAdapter {
  /**
   * Create or attach ESPD
   */
  createOrAttachESPD(input: ESPDPayload, ctx: { tenderTitle: string }): Promise<ESPDResult>;

  /**
   * Submit notice to TED/eForms
   */
  submitNotice(payload: NoticePayload): Promise<NoticeResult>;

  /**
   * Submit award notice
   */
  submitAward(payload: AwardPayload): Promise<NoticeResult>;
}

/**
 * Publishing Mode Configuration
 */
export type PublishingMode = 'ui' | 'api' | 'hybrid';

/**
 * Publishing Strategy Factory
 */
export class PublishingStrategyFactory {
  static createAdapter(mode: PublishingMode): PublishingAdapter {
    switch (mode) {
      case 'ui':
        return new UiAdapter();
      case 'api':
        return new ApiAdapter();
      case 'hybrid':
        return new HybridAdapter();
      default:
        throw new Error(`Unknown publishing mode: ${mode}`);
    }
  }
}



