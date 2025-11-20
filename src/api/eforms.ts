import { blockBidConfig } from '../config/env';
import { EFormsNotice } from '../lib/eforms/builder';

export interface EFormsSubmitResponse {
  id: string;
  status: 'submitted' | 'accepted' | 'published' | 'failed' | 'processing';
  ojsId?: string;
  message?: string;
  errors?: string[];
}

export interface EFormsTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface EFormsError {
  code: string;
  message: string;
  details?: any;
}

/**
 * eForms API Client
 * Handles communication with TED/eForms service providers
 */
export class EFormsApiClient {
  private baseUrl: string;
  private clientId?: string;
  private clientSecret?: string;
  private token?: string;
  private tokenExpiry?: number;

  constructor(baseUrl?: string, clientId?: string, clientSecret?: string) {
    this.baseUrl = baseUrl || blockBidConfig.tedApiBaseUrl || '';
    this.clientId = clientId || blockBidConfig.tedClientId;
    this.clientSecret = clientSecret || blockBidConfig.tedClientSecret;
  }

  /**
   * Get OAuth access token using client credentials flow
   */
  private async getToken(): Promise<string> {
    // Return cached token if still valid
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry - 60000) { // 1 minute buffer
      return this.token;
    }

    if (!this.baseUrl || !this.clientId || !this.clientSecret) {
      throw new Error('TED API credentials not configured (TED_API_BASE_URL, TED_CLIENT_ID, TED_CLIENT_SECRET)');
    }

    try {
      const res = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: 'eforms:submit eforms:read'
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`OAuth token request failed: ${res.status} ${errorText}`);
      }

      const tokenData = await res.json() as EFormsTokenResponse;
      
      // Cache token
      this.token = tokenData.access_token;
      this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
      
      return this.token;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`OAuth token request failed: ${String(error)}`);
    }
  }

  /**
   * Submit eForms notice
   */
  async submitNotice(notice: EFormsNotice): Promise<EFormsSubmitResponse> {
    if (!this.baseUrl) {
      throw new Error('TED_API_BASE_URL not configured');
    }

    const token = await this.getToken();

    try {
      const res = await fetch(`${this.baseUrl}/notices/eforms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(notice)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`eForms notice submit failed: ${res.status} ${errorText}`);
      }

      return await res.json() as EFormsSubmitResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`eForms notice submit request failed: ${String(error)}`);
    }
  }

  /**
   * Submit contract award notice (F03)
   */
  async submitAward(payload: {
    title: string;
    buyer: { name: string; identifier: string };
    winnerName: string;
    winnerIdentifier?: string;
    contractValue?: number;
    cpv?: string[];
    description?: string;
  }): Promise<EFormsSubmitResponse> {
    if (!this.baseUrl) {
      throw new Error('TED_API_BASE_URL not configured');
    }

    const token = await this.getToken();

    try {
      const res = await fetch(`${this.baseUrl}/awards/eforms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`eForms award submit failed: ${res.status} ${errorText}`);
      }

      return await res.json() as EFormsSubmitResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`eForms award submit request failed: ${String(error)}`);
    }
  }

  /**
   * Get notice status
   */
  async getNoticeStatus(id: string): Promise<EFormsSubmitResponse> {
    if (!this.baseUrl) {
      throw new Error('TED_API_BASE_URL not configured');
    }

    const token = await this.getToken();

    try {
      const res = await fetch(`${this.baseUrl}/notices/${id}/status`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`eForms status check failed: ${res.status} ${errorText}`);
      }

      return await res.json() as EFormsSubmitResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`eForms status request failed: ${String(error)}`);
    }
  }

  /**
   * Validate notice before submission
   */
  async validateNotice(notice: EFormsNotice): Promise<{ valid: boolean; errors?: string[] }> {
    if (!this.baseUrl) {
      throw new Error('TED_API_BASE_URL not configured');
    }

    const token = await this.getToken();

    try {
      const res = await fetch(`${this.baseUrl}/notices/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(notice)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`eForms validation failed: ${res.status} ${errorText}`);
      }

      return await res.json() as { valid: boolean; errors?: string[] };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`eForms validation request failed: ${String(error)}`);
    }
  }

  /**
   * Download published notice
   */
  async downloadNotice(id: string, format: 'pdf' | 'xml' = 'pdf'): Promise<Blob> {
    if (!this.baseUrl) {
      throw new Error('TED_API_BASE_URL not configured');
    }

    const token = await this.getToken();

    try {
      const res = await fetch(`${this.baseUrl}/notices/${id}/download?format=${format}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`eForms download failed: ${res.status} ${errorText}`);
      }

      return await res.blob();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`eForms download request failed: ${String(error)}`);
    }
  }
}

/**
 * Default eForms API client instance
 */
export const eformsApi = new EFormsApiClient();

/**
 * Legacy functions for backward compatibility
 */
export async function eformsSubmit(notice: EFormsNotice): Promise<EFormsSubmitResponse> {
  return eformsApi.submitNotice(notice);
}

export async function eformsSubmitAward(payload: {
  title: string;
  buyer: { name: string; identifier: string };
  winnerName: string;
  contractValue?: number;
}): Promise<EFormsSubmitResponse> {
  return eformsApi.submitAward(payload);
}
