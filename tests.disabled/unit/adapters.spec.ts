import { test, expect } from '@playwright/test';
import { PublishingStrategyFactory } from '../../src/adapters/publishing';
import { ApiAdapter } from '../../src/adapters/apiAdapter';
import { UiAdapter } from '../../src/adapters/uiAdapter';
import { HybridAdapter } from '../../src/adapters/hybridAdapter';

test.describe('Publishing Strategy Factory', () => {
  test('creates UI adapter for ui mode', () => {
    const adapter = PublishingStrategyFactory.createAdapter('ui');
    expect(adapter).toBeInstanceOf(UiAdapter);
  });

  test('creates API adapter for api mode', () => {
    const adapter = PublishingStrategyFactory.createAdapter('api');
    expect(adapter).toBeInstanceOf(ApiAdapter);
  });

  test('creates hybrid adapter for hybrid mode', () => {
    const adapter = PublishingStrategyFactory.createAdapter('hybrid');
    expect(adapter).toBeInstanceOf(HybridAdapter);
  });

  test('throws error for unknown mode', () => {
    expect(() => {
      PublishingStrategyFactory.createAdapter('unknown' as any);
    }).toThrow('Unknown publishing mode: unknown');
  });
});

test.describe('API Adapter', () => {
  test('creates ESPD payload correctly', async () => {
    const adapter = new ApiAdapter();
    
    // Mock the API calls to avoid actual network requests
    const mockEspdCreate = jest.fn().mockResolvedValue({
      id: 'espd-123',
      url: 'https://example.com/espd/123',
      status: 'created'
    });
    
    // Replace the actual API call with mock
    const espdApi = require('../../src/api/espd');
    espdApi.espdApi.create = mockEspdCreate;
    
    const result = await adapter.createOrAttachESPD({
      exclusionPreset: 'standardDK',
      selectionCriteria: [
        { type: 'economic', value: 'Financial stability' }
      ]
    }, { tenderTitle: 'Test Tender' });
    
    expect(result.id).toBe('espd-123');
    expect(result.version).toBe('api');
    expect(result.downloadUrl).toBe('https://example.com/espd/123');
  });

  test('creates notice payload correctly', async () => {
    const adapter = new ApiAdapter();
    
    // Mock the API calls
    const mockEformsSubmit = jest.fn().mockResolvedValue({
      id: 'notice-456',
      status: 'submitted',
      ojsId: 'OJ-123'
    });
    
    const eformsApi = require('../../src/api/eforms');
    eformsApi.eformsApi.submitNotice = mockEformsSubmit;
    
    const result = await adapter.submitNotice({
      kind: 'F02',
      title: 'Test Notice',
      cpv: ['12300000'],
      procedure: 'open',
      description: 'Test description'
    });
    
    expect(result.id).toBe('notice-456');
    expect(result.status).toBe('submitted');
    expect(result.ojsId).toBe('OJ-123');
  });

  test('creates award payload correctly', async () => {
    const adapter = new ApiAdapter();
    
    // Mock the API calls
    const mockEformsSubmitAward = jest.fn().mockResolvedValue({
      id: 'award-789',
      status: 'published',
      ojsId: 'OJ-456'
    });
    
    const eformsApi = require('../../src/api/eforms');
    eformsApi.eformsApi.submitAward = mockEformsSubmitAward;
    
    const result = await adapter.submitAward({
      tenderTitle: 'Test Tender',
      winnerName: 'Winner A/S',
      contractValue: 1000000
    });
    
    expect(result.id).toBe('award-789');
    expect(result.status).toBe('published');
    expect(result.ojsId).toBe('OJ-456');
  });
});

test.describe('Hybrid Adapter', () => {
  test('falls back to UI when API fails', async () => {
    // Mock page for UI adapter
    const mockPage = {
      locator: jest.fn(),
      click: jest.fn(),
      fill: jest.fn(),
      waitFor: jest.fn()
    };
    
    const adapter = new HybridAdapter(mockPage as any);
    
    // Mock API to fail
    const mockApiAdapter = {
      createOrAttachESPD: jest.fn().mockRejectedValue(new Error('API failed'))
    };
    
    // Mock UI adapter to succeed
    const mockUiAdapter = {
      createOrAttachESPD: jest.fn().mockResolvedValue({
        id: 'ui-espd-123',
        version: 'ui',
        message: 'ESPD created via UI'
      })
    };
    
    // Replace adapters with mocks
    (adapter as any).apiAdapter = mockApiAdapter;
    (adapter as any).uiAdapter = mockUiAdapter;
    
    const result = await adapter.createOrAttachESPD({
      exclusionPreset: 'standardDK',
      selectionCriteria: []
    }, { tenderTitle: 'Test Tender' });
    
    expect(result.id).toBe('ui-espd-123');
    expect(result.version).toBe('ui');
    expect(result.message).toContain('API fallback');
    expect(mockApiAdapter.createOrAttachESPD).toHaveBeenCalled();
    expect(mockUiAdapter.createOrAttachESPD).toHaveBeenCalled();
  });

  test('uses API when it succeeds', async () => {
    const mockPage = {} as any;
    const adapter = new HybridAdapter(mockPage);
    
    // Mock API to succeed
    const mockApiAdapter = {
      createOrAttachESPD: jest.fn().mockResolvedValue({
        id: 'api-espd-123',
        version: 'api',
        message: 'ESPD created via API'
      })
    };
    
    // Mock UI adapter (should not be called)
    const mockUiAdapter = {
      createOrAttachESPD: jest.fn()
    };
    
    // Replace adapters with mocks
    (adapter as any).apiAdapter = mockApiAdapter;
    (adapter as any).uiAdapter = mockUiAdapter;
    
    const result = await adapter.createOrAttachESPD({
      exclusionPreset: 'standardDK',
      selectionCriteria: []
    }, { tenderTitle: 'Test Tender' });
    
    expect(result.id).toBe('api-espd-123');
    expect(result.version).toBe('api');
    expect(mockApiAdapter.createOrAttachESPD).toHaveBeenCalled();
    expect(mockUiAdapter.createOrAttachESPD).not.toHaveBeenCalled();
  });

  test('throws error when both API and UI fail', async () => {
    const mockPage = {} as any;
    const adapter = new HybridAdapter(mockPage);
    
    // Mock both to fail
    const mockApiAdapter = {
      createOrAttachESPD: jest.fn().mockRejectedValue(new Error('API failed'))
    };
    
    const mockUiAdapter = {
      createOrAttachESPD: jest.fn().mockRejectedValue(new Error('UI failed'))
    };
    
    // Replace adapters with mocks
    (adapter as any).apiAdapter = mockApiAdapter;
    (adapter as any).uiAdapter = mockUiAdapter;
    
    await expect(adapter.createOrAttachESPD({
      exclusionPreset: 'standardDK',
      selectionCriteria: []
    }, { tenderTitle: 'Test Tender' })).rejects.toThrow('Both API and UI ESPD creation failed');
  });
});
