import { blockBidConfig } from '../config/env';
import { EspdRequest } from '../lib/espd/builder';

export interface EspdCreateResponse {
  id: string;
  url?: string;
  status: 'created' | 'processing' | 'ready' | 'failed';
  message?: string;
}

export interface EspdError {
  code: string;
  message: string;
  details?: any;
}

/**
 * ESPD API Client
 * Handles communication with ESPD service providers
 */
export class EspdApiClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || blockBidConfig.espdApiBaseUrl || '';
    this.apiKey = apiKey || blockBidConfig.espdApiKey;
  }

  /**
   * Create ESPD request via API
   */
  async create(req: EspdRequest, opts?: { format?: 'json' | 'xml' }): Promise<EspdCreateResponse> {
    if (!this.baseUrl) {
      throw new Error('ESPD_API_BASE_URL not configured');
    }

    const format = opts?.format ?? 'json';
    const endpoint = `${this.baseUrl}/espd`;
    const headers: Record<string, string> = {
      'Content-Type': format === 'json' ? 'application/json' : 'application/xml',
      'Accept': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    let body: string;
    if (format === 'json') {
      body = JSON.stringify(req);
    } else {
      // Use XML if available in the request object
      const xmlBody = (req as any).__xml;
      if (!xmlBody) {
        throw new Error('XML format requested but no XML body available. Use buildEspdWithXml() first.');
      }
      body = xmlBody;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`ESPD ${format.toUpperCase()} create failed: ${res.status} ${errorText}`);
      }

      const result = await res.json() as EspdCreateResponse;
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`ESPD API request failed: ${String(error)}`);
    }
  }

  /**
   * Get ESPD request status
   */
  async getStatus(id: string): Promise<EspdCreateResponse> {
    if (!this.baseUrl) {
      throw new Error('ESPD_API_BASE_URL not configured');
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const res = await fetch(`${this.baseUrl}/espd/${id}`, {
        method: 'GET',
        headers
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`ESPD status check failed: ${res.status} ${errorText}`);
      }

      return await res.json() as EspdCreateResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`ESPD status request failed: ${String(error)}`);
    }
  }

  /**
   * Download ESPD document
   */
  async download(id: string, format: 'pdf' | 'xml' = 'pdf'): Promise<Blob> {
    if (!this.baseUrl) {
      throw new Error('ESPD_API_BASE_URL not configured');
    }

    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const res = await fetch(`${this.baseUrl}/espd/${id}/download?format=${format}`, {
        method: 'GET',
        headers
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`ESPD download failed: ${res.status} ${errorText}`);
      }

      return await res.blob();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`ESPD download request failed: ${String(error)}`);
    }
  }

  /**
   * Validate ESPD request before submission
   */
  async validate(req: EspdRequest): Promise<{ valid: boolean; errors?: string[] }> {
    if (!this.baseUrl) {
      throw new Error('ESPD_API_BASE_URL not configured');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const res = await fetch(`${this.baseUrl}/espd/validate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(req)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`ESPD validation failed: ${res.status} ${errorText}`);
      }

      return await res.json() as { valid: boolean; errors?: string[] };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`ESPD validation request failed: ${String(error)}`);
    }
  }
}

/**
 * Default ESPD API client instance
 */
export const espdApi = new EspdApiClient();

/**
 * Legacy function for backward compatibility
 */
export async function espdCreate(req: EspdRequest, opts?: { format?: 'json' | 'xml' }): Promise<EspdCreateResponse> {
  return espdApi.create(req, opts);
}
